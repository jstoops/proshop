import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'api-test-secret';
process.env.PAGINATION_LIMIT = '2';
process.env.PAYPAL_CLIENT_ID = 'paypal-client';
process.env.PAYPAL_APP_SECRET = 'paypal-secret';
process.env.PAYPAL_API_URL = 'https://paypal.test';

const { default: app } = await import('../app.js');
const { default: User } = await import('../models/userModel.js');
const { default: Product } = await import('../models/productModel.js');
const { default: Order } = await import('../models/orderModel.js');
const { clearDb, startDb, stopDb } = await import('./helpers/db.js');

const shippingAddress = {
  address: '1 Main St',
  city: 'Boston',
  postalCode: '02101',
  country: 'USA',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function createUser(overrides = {}) {
  return User.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    ...overrides,
  });
}

async function login(email, password = 'password123') {
  const agent = request.agent(app);
  const res = await agent.post('/api/users/auth').send({ email, password });
  assert.equal(res.status, 200);
  return { agent, res };
}

async function createProduct(userId, overrides = {}) {
  return Product.create({
    user: userId,
    name: 'Phone',
    image: '/images/phone.jpg',
    brand: 'Acme',
    category: 'Electronics',
    description: 'A phone',
    price: 100,
    countInStock: 5,
    rating: 0,
    numReviews: 0,
    ...overrides,
  });
}

describe('HTTP API', () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('general routes', () => {
    it('reports that the API is running', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.equal(res.text, 'API is running....');
    });

    it('returns the PayPal client id', async () => {
      const res = await request(app).get('/api/config/paypal');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { clientId: 'paypal-client' });
    });

    it('returns a JSON 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nope');
      assert.equal(res.status, 404);
      assert.equal(res.body.message, 'Not Found - /api/nope');
      assert.equal(typeof res.body.stack, 'string');
    });
  });

  describe('users', () => {
    it('registers a shopper and starts a session', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/users').send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'Jane Doe');
      assert.equal(res.body.email, 'jane@example.com');
      assert.equal(res.body.isAdmin, false);
      assert.equal(res.body.password, undefined);
      assert.match(res.headers['set-cookie'][0], /jwt=/);
      assert.match(res.headers['set-cookie'][0], /HttpOnly/i);
      assert.match(res.headers['set-cookie'][0], /SameSite=Strict/i);
      assert.doesNotMatch(res.headers['set-cookie'][0], /Secure/i);

      const profile = await agent.get('/api/users/profile');
      assert.equal(profile.status, 200);
      assert.equal(profile.body.email, 'jane@example.com');
    });

    it('rejects a duplicate registration', async () => {
      await createUser();
      const res = await request(app).post('/api/users').send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'User already exists');
    });

    it('rejects registration that fails model validation', async () => {
      const res = await request(app).post('/api/users').send({
        email: 'jane@example.com',
        password: 'password123',
      });

      assert.equal(res.status, 500);
      assert.match(res.body.message, /name/);
    });

    it('logs in with the right password and rejects bad credentials', async () => {
      await createUser();

      const success = await request(app).post('/api/users/auth').send({
        email: 'jane@example.com',
        password: 'password123',
      });
      assert.equal(success.status, 200);
      assert.equal(success.body.email, 'jane@example.com');

      const wrongPassword = await request(app).post('/api/users/auth').send({
        email: 'jane@example.com',
        password: 'nope',
      });
      assert.equal(wrongPassword.status, 401);
      assert.equal(wrongPassword.body.message, 'Invalid email or password');
      assert.equal(wrongPassword.headers['set-cookie'], undefined);

      const unknown = await request(app).post('/api/users/auth').send({
        email: 'missing@example.com',
        password: 'password123',
      });
      assert.equal(unknown.status, 401);
      assert.equal(unknown.body.message, 'Invalid email or password');
    });

    it('marks the session cookie secure when not in development', async () => {
      await createUser();
      process.env.NODE_ENV = 'production';
      try {
        const res = await request(app).post('/api/users/auth').send({
          email: 'jane@example.com',
          password: 'password123',
        });
        assert.equal(res.status, 200);
        assert.match(res.headers['set-cookie'][0], /Secure/i);
      } finally {
        process.env.NODE_ENV = 'development';
      }
    });

    it('logs out and blocks later private requests', async () => {
      await createUser();
      const { agent } = await login('jane@example.com');

      const res = await agent.post('/api/users/logout');
      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Logged out successfully');

      const profile = await agent.get('/api/users/profile');
      assert.equal(profile.status, 401);
      assert.equal(profile.body.message, 'Not authorized, no token');
    });

    it('rejects a tampered session cookie', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Cookie', 'jwt=not-a-token');

      assert.equal(res.status, 401);
      assert.equal(res.body.message, 'Not authorized, token failed');
    });

    it('updates the signed-in profile, including the password', async () => {
      await createUser();
      const { agent } = await login('jane@example.com');

      const updated = await agent.put('/api/users/profile').send({
        name: 'Janet Doe',
        email: 'janet@example.com',
        password: 'new-password',
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.name, 'Janet Doe');
      assert.equal(updated.body.email, 'janet@example.com');

      const oldLogin = await request(app).post('/api/users/auth').send({
        email: 'janet@example.com',
        password: 'password123',
      });
      assert.equal(oldLogin.status, 401);

      const newLogin = await request(app).post('/api/users/auth').send({
        email: 'janet@example.com',
        password: 'new-password',
      });
      assert.equal(newLogin.status, 200);
    });

    it('keeps the current password when a profile update omits one', async () => {
      await createUser();
      const { agent } = await login('jane@example.com');

      const updated = await agent.put('/api/users/profile').send({
        name: 'Janet Doe',
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.email, 'jane@example.com');

      const relogin = await request(app).post('/api/users/auth').send({
        email: 'jane@example.com',
        password: 'password123',
      });
      assert.equal(relogin.status, 200);
    });

    it('requires authentication for the profile', async () => {
      const res = await request(app).get('/api/users/profile');
      assert.equal(res.status, 401);

      const update = await request(app).put('/api/users/profile').send({
        name: 'Nope',
      });
      assert.equal(update.status, 401);
    });

    it('lets an admin list, read, update, and delete shoppers', async () => {
      const admin = await createUser({
        name: 'Admin',
        email: 'admin@example.com',
        isAdmin: true,
      });
      const shopper = await createUser();
      const { agent } = await login('admin@example.com');

      const list = await agent.get('/api/users');
      assert.equal(list.status, 200);
      assert.equal(list.body.length, 2);
      assert.ok(list.body.some((user) => user.email === shopper.email));

      const details = await agent.get(`/api/users/${shopper._id}`);
      assert.equal(details.status, 200);
      assert.equal(details.body.password, undefined);
      assert.equal(details.body.email, shopper.email);

      const updated = await agent.put(`/api/users/${shopper._id}`).send({
        name: 'Updated Jane',
        email: 'updated@example.com',
        isAdmin: true,
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.isAdmin, true);
      assert.equal(updated.body.name, 'Updated Jane');

      const demoted = await agent.put(`/api/users/${shopper._id}`).send({
        name: 'Updated Jane',
        email: 'updated@example.com',
        isAdmin: false,
      });
      assert.equal(demoted.status, 200);
      assert.equal(demoted.body.isAdmin, false);

      const removed = await agent.delete(`/api/users/${shopper._id}`);
      assert.equal(removed.status, 200);
      assert.equal(removed.body.message, 'User removed');
      assert.equal(await User.countDocuments({ _id: shopper._id }), 0);
      assert.equal(admin.isAdmin, true);
    });

    it('refuses to delete an admin account', async () => {
      const admin = await createUser({
        name: 'Admin',
        email: 'admin@example.com',
        isAdmin: true,
      });
      const { agent } = await login('admin@example.com');

      const res = await agent.delete(`/api/users/${admin._id}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'Can not delete admin user');
    });

    it('blocks shoppers from admin user routes', async () => {
      const shopper = await createUser();
      const { agent } = await login('jane@example.com');

      const list = await agent.get('/api/users');
      assert.equal(list.status, 401);
      assert.equal(list.body.message, 'Not authorized as an admin');

      const details = await agent.get(`/api/users/${shopper._id}`);
      assert.equal(details.status, 401);

      const update = await agent.put(`/api/users/${shopper._id}`).send({
        name: 'Hacker',
        email: 'hacker@example.com',
        isAdmin: true,
      });
      assert.equal(update.status, 401);

      const removed = await agent.delete(`/api/users/${shopper._id}`);
      assert.equal(removed.status, 401);
    });

    it('returns 404 when an admin targets a missing user', async () => {
      await createUser({
        name: 'Admin',
        email: 'admin@example.com',
        isAdmin: true,
      });
      const { agent } = await login('admin@example.com');
      const missing = new mongoose.Types.ObjectId().toString();

      const details = await agent.get(`/api/users/${missing}`);
      assert.equal(details.status, 404);
      assert.equal(details.body.message, 'User not found');

      const update = await agent.put(`/api/users/${missing}`).send({
        name: 'Nobody',
        email: 'nobody@example.com',
        isAdmin: false,
      });
      assert.equal(update.status, 404);
      assert.equal(update.body.message, 'User not found');

      const removed = await agent.delete(`/api/users/${missing}`);
      assert.equal(removed.status, 404);
      assert.equal(removed.body.message, 'User not found');
    });
  });

  describe('products', () => {
    it('paginates the catalog and searches by name', async () => {
      const admin = await createUser({
        email: 'admin@example.com',
        isAdmin: true,
      });
      await createProduct(admin._id, { name: 'Alpha Phone' });
      await createProduct(admin._id, { name: 'Beta Phone' });
      await createProduct(admin._id, { name: 'Gamma Cable' });
      await createProduct(admin._id, { name: 'Delta Speaker' });
      await createProduct(admin._id, { name: 'Epsilon Mouse' });

      const first = await request(app).get('/api/products');
      assert.equal(first.status, 200);
      assert.equal(first.body.page, 1);
      assert.equal(first.body.pages, 3);
      assert.equal(first.body.products.length, 2);

      const second = await request(app).get('/api/products?pageNumber=2');
      assert.equal(second.body.products.length, 2);
      assert.equal(second.body.page, 2);

      const last = await request(app).get('/api/products?pageNumber=3');
      assert.equal(last.body.products.length, 1);

      const invalidPage = await request(app).get('/api/products?pageNumber=abc');
      assert.equal(invalidPage.body.page, 1);
      assert.equal(invalidPage.body.products.length, 2);

      const search = await request(app).get('/api/products?keyword=phone');
      assert.equal(search.body.products.length, 2);
      assert.ok(search.body.products.every((product) => /phone/i.test(product.name)));

      const upper = await request(app).get('/api/products?keyword=CABLE');
      assert.equal(upper.body.products.length, 1);
      assert.equal(upper.body.products[0].name, 'Gamma Cable');

      const none = await request(app).get('/api/products?keyword=missing');
      assert.deepEqual(none.body.products, []);
      assert.equal(none.body.pages, 0);
    });

    it('returns one product and 404s for a missing or invalid id', async () => {
      const admin = await createUser({ isAdmin: true, email: 'admin@example.com' });
      const product = await createProduct(admin._id);

      const found = await request(app).get(`/api/products/${product._id}`);
      assert.equal(found.status, 200);
      assert.equal(found.body.name, 'Phone');

      const missing = await request(app).get(
        `/api/products/${new mongoose.Types.ObjectId()}`
      );
      assert.equal(missing.status, 404);
      assert.equal(missing.body.message, 'Product not found');

      const invalid = await request(app).get('/api/products/not-an-id');
      assert.equal(invalid.status, 404);
      assert.match(invalid.body.message, /Invalid ObjectId/);
    });

    it('returns the three highest rated products', async () => {
      const admin = await createUser({ isAdmin: true, email: 'admin@example.com' });
      await createProduct(admin._id, { name: 'Low', rating: 1 });
      await createProduct(admin._id, { name: 'Mid', rating: 3 });
      await createProduct(admin._id, { name: 'High', rating: 5 });
      await createProduct(admin._id, { name: 'Higher', rating: 4 });

      const res = await request(app).get('/api/products/top');
      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.map((product) => product.name),
        ['High', 'Higher', 'Mid']
      );
    });

    it('lets an admin create, update, and delete a product', async () => {
      const admin = await createUser({
        name: 'Admin',
        email: 'admin@example.com',
        isAdmin: true,
      });
      const { agent } = await login('admin@example.com');

      const created = await agent.post('/api/products');
      assert.equal(created.status, 201);
      assert.equal(created.body.name, 'Sample name');
      assert.equal(created.body.user, admin._id.toString());

      const updated = await agent.put(`/api/products/${created.body._id}`).send({
        name: 'Edited',
        price: 42,
        description: 'Updated description',
        image: '/images/edited.jpg',
        brand: 'Edited brand',
        category: 'Audio',
        countInStock: 8,
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.body.name, 'Edited');
      assert.equal(updated.body.price, 42);
      assert.equal(updated.body.countInStock, 8);

      const removed = await agent.delete(`/api/products/${created.body._id}`);
      assert.equal(removed.status, 200);
      assert.equal(removed.body.message, 'Product removed');

      const gone = await request(app).get(`/api/products/${created.body._id}`);
      assert.equal(gone.status, 404);
    });

    it('404s when an admin updates or deletes a missing product', async () => {
      await createUser({ email: 'admin@example.com', isAdmin: true });
      const { agent } = await login('admin@example.com');
      const missing = new mongoose.Types.ObjectId().toString();

      const updated = await agent.put(`/api/products/${missing}`).send({
        name: 'Nope',
        price: 1,
        description: 'Nope',
        image: '/images/nope.jpg',
        brand: 'Nope',
        category: 'Nope',
        countInStock: 1,
      });
      assert.equal(updated.status, 404);
      assert.equal(updated.body.message, 'Product not found');

      const removed = await agent.delete(`/api/products/${missing}`);
      assert.equal(removed.status, 404);
      assert.equal(removed.body.message, 'Product not found');

      const invalid = await agent.delete('/api/products/not-an-id');
      assert.equal(invalid.status, 404);
      assert.match(invalid.body.message, /Invalid ObjectId/);
    });

    it('blocks shoppers and anonymous users from product management', async () => {
      const shopper = await createUser();
      const product = await createProduct(shopper._id);
      const { agent } = await login('jane@example.com');

      const created = await agent.post('/api/products');
      assert.equal(created.status, 401);

      const anonymous = await request(app).post('/api/products');
      assert.equal(anonymous.status, 401);
      assert.equal(anonymous.body.message, 'Not authorized, no token');

      const updated = await agent.put(`/api/products/${product._id}`).send({
        name: 'Hacked',
        price: 1,
        description: 'Hacked',
        image: '/images/hacked.jpg',
        brand: 'Hacked',
        category: 'Hacked',
        countInStock: 1,
      });
      assert.equal(updated.status, 401);

      const removed = await agent.delete(`/api/products/${product._id}`);
      assert.equal(removed.status, 401);
    });

    it('records a review and averages the rating', async () => {
      const admin = await createUser({
        name: 'Admin',
        email: 'admin@example.com',
        isAdmin: true,
      });
      await createUser({ name: 'Jane Doe', email: 'jane@example.com' });
      const product = await createProduct(admin._id, { rating: 0, numReviews: 0 });
      const jane = await login('jane@example.com');
      const adminAgent = await login('admin@example.com');

      const first = await jane.agent
        .post(`/api/products/${product._id}/reviews`)
        .send({ rating: 4, comment: 'Solid' });
      assert.equal(first.status, 201);
      assert.equal(first.body.message, 'Review added');

      const duplicate = await jane.agent
        .post(`/api/products/${product._id}/reviews`)
        .send({ rating: 1, comment: 'Again' });
      assert.equal(duplicate.status, 400);
      assert.equal(duplicate.body.message, 'Product already reviewed');

      const second = await adminAgent.agent
        .post(`/api/products/${product._id}/reviews`)
        .send({ rating: 2, comment: 'Okay' });
      assert.equal(second.status, 201);

      const fresh = await Product.findById(product._id);
      assert.equal(fresh.numReviews, 2);
      assert.equal(fresh.rating, 3);
      assert.deepEqual(
        fresh.reviews.map((review) => review.name).sort(),
        ['Admin', 'Jane Doe']
      );
    });

    it('rejects reviews from anonymous users and for missing products', async () => {
      const admin = await createUser({ email: 'admin@example.com', isAdmin: true });
      const product = await createProduct(admin._id);
      const { agent } = await login('admin@example.com');

      const anonymous = await request(app)
        .post(`/api/products/${product._id}/reviews`)
        .send({ rating: 5, comment: 'Hi' });
      assert.equal(anonymous.status, 401);

      const invalid = await agent
        .post('/api/products/not-an-id/reviews')
        .send({ rating: 5, comment: 'Hi' });
      assert.equal(invalid.status, 404);
      assert.match(invalid.body.message, /Invalid ObjectId/);

      const missing = await agent
        .post(`/api/products/${new mongoose.Types.ObjectId()}/reviews`)
        .send({ rating: 5, comment: 'Hi' });
      assert.equal(missing.status, 404);
      assert.equal(missing.body.message, 'Product not found');
    });
  });

  describe('orders', () => {
    async function seedShopperAndProduct(price = 100) {
      const shopper = await createUser();
      const product = await createProduct(shopper._id, { price, name: 'Phone' });
      const { agent } = await login('jane@example.com');
      return { shopper, product, agent };
    }

    function orderPayload(product, qty = 1, price = 1) {
      return {
        orderItems: [
          {
            _id: product._id.toString(),
            name: product.name,
            qty,
            image: product.image,
            price,
          },
        ],
        shippingAddress,
        paymentMethod: 'PayPal',
      };
    }

    it('prices an order from the database and ignores the client price', async () => {
      const { product, agent, shopper } = await seedShopperAndProduct(80);

      const res = await agent.post('/api/orders').send(orderPayload(product, 2, 0.01));

      assert.equal(res.status, 201);
      assert.equal(res.body.user, shopper._id.toString());
      assert.equal(res.body.orderItems.length, 1);
      assert.equal(res.body.orderItems[0].price, 80);
      assert.equal(res.body.orderItems[0].qty, 2);
      assert.equal(res.body.orderItems[0].product, product._id.toString());
      assert.equal(res.body.itemsPrice, 160);
      assert.equal(res.body.shippingPrice, 0);
      assert.equal(res.body.taxPrice, 24);
      assert.equal(res.body.totalPrice, 184);
      assert.equal(res.body.isPaid, false);
      assert.deepEqual(res.body.shippingAddress, shippingAddress);
    });

    it('charges shipping when the database price is 100 or less', async () => {
      const { product, agent } = await seedShopperAndProduct(40);
      const res = await agent.post('/api/orders').send(orderPayload(product, 1, 40));

      assert.equal(res.status, 201);
      assert.equal(res.body.itemsPrice, 40);
      assert.equal(res.body.shippingPrice, 10);
      assert.equal(res.body.taxPrice, 6);
      assert.equal(res.body.totalPrice, 56);
    });

    it('rejects an empty order and an unknown product', async () => {
      const { agent } = await seedShopperAndProduct();

      const empty = await agent.post('/api/orders').send({
        orderItems: [],
        shippingAddress,
        paymentMethod: 'PayPal',
      });
      assert.equal(empty.status, 400);
      assert.equal(empty.body.message, 'No order items');

      const missing = await agent.post('/api/orders').send({
        orderItems: [
          {
            _id: new mongoose.Types.ObjectId().toString(),
            name: 'Ghost',
            qty: 1,
            image: '/images/ghost.jpg',
            price: 10,
          },
        ],
        shippingAddress,
        paymentMethod: 'PayPal',
      });
      assert.equal(missing.status, 404);
      assert.equal(missing.body.message, 'Product not found');
    });

    it('requires a session to create or list orders', async () => {
      const res = await request(app).post('/api/orders').send({
        orderItems: [],
        shippingAddress,
        paymentMethod: 'PayPal',
      });
      assert.equal(res.status, 401);

      const mine = await request(app).get('/api/orders/mine');
      assert.equal(mine.status, 401);

      const all = await request(app).get('/api/orders');
      assert.equal(all.status, 401);
    });

    it('returns the signed-in shopper orders and one order by id', async () => {
      const { product, agent, shopper } = await seedShopperAndProduct(40);
      const created = await agent.post('/api/orders').send(orderPayload(product));

      await createUser({
        name: 'Other',
        email: 'other@example.com',
      });
      const other = await login('other@example.com');
      const otherProduct = await createProduct(shopper._id, {
        name: 'Cable',
        price: 15,
      });
      await other.agent.post('/api/orders').send(orderPayload(otherProduct));

      const mine = await agent.get('/api/orders/mine');
      assert.equal(mine.status, 200);
      assert.equal(mine.body.length, 1);
      assert.equal(mine.body[0]._id, created.body._id);

      const details = await agent.get(`/api/orders/${created.body._id}`);
      assert.equal(details.status, 200);
      assert.equal(details.body.user.name, 'Jane Doe');
      assert.equal(details.body.user.email, 'jane@example.com');

      const missing = await agent.get(
        `/api/orders/${new mongoose.Types.ObjectId()}`
      );
      assert.equal(missing.status, 404);
      assert.equal(missing.body.message, 'Order not found');
    });

    it('marks an order paid only after a new PayPal capture for the right amount', async (t) => {
      const { product, agent } = await seedShopperAndProduct(40);
      const created = await agent.post('/api/orders').send(orderPayload(product));
      const orderId = created.body._id;
      const paypalBody = {
        id: 'PAY-1',
        status: 'COMPLETED',
        update_time: '2024-01-01T00:00:00Z',
        payer: { email_address: 'buyer@example.com' },
      };

      t.mock.method(globalThis, 'fetch', async (url) => {
        if (String(url).includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'token-123' });
        }
        return jsonResponse({
          status: 'COMPLETED',
          purchase_units: [{ amount: { value: '56.00' } }],
        });
      });

      const paid = await agent.put(`/api/orders/${orderId}/pay`).send(paypalBody);
      assert.equal(paid.status, 200);
      assert.equal(paid.body.isPaid, true);
      assert.ok(paid.body.paidAt);
      assert.equal(paid.body.paymentResult.id, 'PAY-1');
      assert.equal(paid.body.paymentResult.status, 'COMPLETED');
      assert.equal(
        paid.body.paymentResult.update_time,
        '2024-01-01T00:00:00Z'
      );
      assert.equal(paid.body.paymentResult.email_address, 'buyer@example.com');

      const reused = await agent.put(`/api/orders/${orderId}/pay`).send(paypalBody);
      assert.equal(reused.status, 500);
      assert.equal(reused.body.message, 'Transaction has been used before');
    });

    it('rejects unverified payments, the wrong amount, and a missing order', async (t) => {
      const { product, agent } = await seedShopperAndProduct(40);
      const created = await agent.post('/api/orders').send(orderPayload(product));
      const paypal = {
        status: 'CREATED',
        value: '56.00',
      };

      t.mock.method(globalThis, 'fetch', async (url) => {
        if (String(url).includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'token-123' });
        }
        return jsonResponse({
          status: paypal.status,
          purchase_units: [{ amount: { value: paypal.value } }],
        });
      });

      const unverified = await agent.put(`/api/orders/${created.body._id}/pay`).send({
        id: 'PAY-NEW',
        status: 'CREATED',
        update_time: '2024-01-01T00:00:00Z',
        payer: { email_address: 'buyer@example.com' },
      });
      assert.equal(unverified.status, 500);
      assert.equal(unverified.body.message, 'Payment not verified');

      paypal.status = 'COMPLETED';
      paypal.value = '1.00';
      const wrongAmount = await agent
        .put(`/api/orders/${created.body._id}/pay`)
        .send({
          id: 'PAY-WRONG',
          status: 'COMPLETED',
          update_time: '2024-01-01T00:00:00Z',
          payer: { email_address: 'buyer@example.com' },
        });
      assert.equal(wrongAmount.status, 500);
      assert.equal(wrongAmount.body.message, 'Incorrect amount paid');

      paypal.value = '56.00';
      const missing = await agent
        .put(`/api/orders/${new mongoose.Types.ObjectId()}/pay`)
        .send({
          id: 'PAY-MISSING',
          status: 'COMPLETED',
          update_time: '2024-01-01T00:00:00Z',
          payer: { email_address: 'buyer@example.com' },
        });
      assert.equal(missing.status, 404);
      assert.equal(missing.body.message, 'Order not found');
    });

    it('lets an admin list orders and mark one delivered', async () => {
      const shopper = await createUser();
      await createUser({
        name: 'Admin',
        email: 'admin@example.com',
        isAdmin: true,
      });
      const product = await createProduct(shopper._id, { price: 40 });
      const shopperAgent = await login('jane@example.com');
      const created = await shopperAgent.agent
        .post('/api/orders')
        .send(orderPayload(product));
      const { agent } = await login('admin@example.com');

      const list = await agent.get('/api/orders');
      assert.equal(list.status, 200);
      assert.equal(list.body.length, 1);
      assert.equal(list.body[0].user.name, 'Jane Doe');

      const shopperList = await shopperAgent.agent.get('/api/orders');
      assert.equal(shopperList.status, 401);

      const delivered = await agent.put(`/api/orders/${created.body._id}/deliver`);
      assert.equal(delivered.status, 200);
      assert.equal(delivered.body.isDelivered, true);
      assert.ok(delivered.body.deliveredAt);

      const shopperDeliver = await shopperAgent.agent.put(
        `/api/orders/${created.body._id}/deliver`
      );
      assert.equal(shopperDeliver.status, 401);

      const missing = await agent.put(
        `/api/orders/${new mongoose.Types.ObjectId()}/deliver`
      );
      assert.equal(missing.status, 404);
      assert.equal(missing.body.message, 'Order not found');
    });
  });
});
