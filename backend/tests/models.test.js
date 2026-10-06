import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import { clearDb, startDb, stopDb } from './helpers/db.js';

const shippingAddress = {
  address: '1 Main St',
  city: 'Boston',
  postalCode: '02101',
  country: 'USA',
};

describe('mongoose models', () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('User', () => {
    it('hashes the password and can match the original value', async () => {
      const user = await User.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      assert.notEqual(user.password, 'password123');
      assert.equal(user.isAdmin, false);
      assert.equal(await user.matchPassword('password123'), true);
      assert.equal(await user.matchPassword('wrong'), false);
      assert.ok(user.createdAt instanceof Date);
    });

    it('rejects a duplicate email', async () => {
      await User.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      await assert.rejects(
        User.create({
          name: 'Other Jane',
          email: 'jane@example.com',
          password: 'password123',
        }),
        /duplicate key/i
      );
    });

    it('requires a name, email, and password', async () => {
      await assert.rejects(User.create({ email: 'a@b.com', password: 'x' }), /name/);
      await assert.rejects(User.create({ name: 'A', password: 'x' }), /email/);
      await assert.rejects(User.create({ name: 'A', email: 'a@b.com' }), /password/);
    });

    it('keeps the existing password hash when other fields change', async () => {
      const user = await User.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });
      const hashed = user.password;

      user.name = 'Janet Doe';
      await user.save();

      const fresh = await User.findById(user._id);
      assert.equal(fresh.name, 'Janet Doe');
      assert.equal(fresh.password, hashed);
      assert.equal(await fresh.matchPassword('password123'), true);
    });

    it('stores a new hash when the password changes', async () => {
      const user = await User.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });
      const hashed = user.password;

      user.password = 'new-password';
      await user.save();

      const fresh = await User.findById(user._id);
      assert.notEqual(fresh.password, hashed);
      assert.equal(await fresh.matchPassword('new-password'), true);
      assert.equal(await fresh.matchPassword('password123'), false);
    });
  });

  describe('Product', () => {
    it('requires catalog fields and defaults review counters', async () => {
      const userId = new mongoose.Types.ObjectId();
      const product = await Product.create({
        user: userId,
        name: 'Phone',
        image: '/images/phone.jpg',
        brand: 'Acme',
        category: 'Electronics',
        description: 'A phone',
      });

      assert.equal(product.rating, 0);
      assert.equal(product.numReviews, 0);
      assert.equal(product.price, 0);
      assert.equal(product.countInStock, 0);
      assert.deepEqual(product.reviews, []);
    });

    it('rejects a product that is missing its name', async () => {
      await assert.rejects(
        Product.create({
          user: new mongoose.Types.ObjectId(),
          image: '/images/phone.jpg',
          brand: 'Acme',
          category: 'Electronics',
          description: 'A phone',
        }),
        /name/
      );
    });

    it('stores a review subdocument', async () => {
      const product = await Product.create({
        user: new mongoose.Types.ObjectId(),
        name: 'Phone',
        image: '/images/phone.jpg',
        brand: 'Acme',
        category: 'Electronics',
        description: 'A phone',
        reviews: [
          {
            name: 'Jane',
            rating: 5,
            comment: 'Great',
            user: new mongoose.Types.ObjectId(),
          },
        ],
      });

      assert.equal(product.reviews.length, 1);
      assert.equal(product.reviews[0].comment, 'Great');
    });
  });

  describe('Order', () => {
    it('defaults payment and delivery flags to false', async () => {
      const order = await Order.create({
        user: new mongoose.Types.ObjectId(),
        orderItems: [
          {
            name: 'Phone',
            qty: 1,
            image: '/images/phone.jpg',
            price: 100,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        shippingAddress,
        paymentMethod: 'PayPal',
      });

      assert.equal(order.isPaid, false);
      assert.equal(order.isDelivered, false);
      assert.equal(order.paidAt, undefined);
      assert.equal(order.deliveredAt, undefined);
      assert.equal(order.itemsPrice, 0);
    });

    it('requires a shipping address and at least the item fields', async () => {
      await assert.rejects(
        Order.create({
          user: new mongoose.Types.ObjectId(),
          orderItems: [],
          paymentMethod: 'PayPal',
        }),
        /shippingAddress/
      );
    });
  });
});
