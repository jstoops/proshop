import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice';
import authReducer, { setCredentials } from './authSlice';
import { orderApiSlice } from './ordersApiSlice';
import { productsApiSlice } from './productsApiSlice';
import { userApiSlice } from './usersApiSlice';

function makeStore() {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('API slices', () => {
  let store;
  let calls;
  let responseFactory;

  beforeEach(() => {
    localStorage.clear();
    calls = [];
    responseFactory = () => jsonResponse({ ok: true });
    const fetchMock = jest.fn(async (input, init) => {
      calls.push({ input, init });
      return responseFactory();
    });
    global.fetch = fetchMock;
    window.fetch = fetchMock;
    store = makeStore();
  });

  afterEach(() => {
    store.dispatch(apiSlice.util.resetApiState());
  });

  async function send(action) {
    const request = store.dispatch(action);
    await request;
    if (request.unsubscribe) {
      request.unsubscribe();
    }
    const call = calls[0];
    const url = typeof call.input === 'string' ? call.input : call.input.url;
    const method =
      (call.init && call.init.method) ||
      (typeof call.input !== 'string' && call.input.method) ||
      'GET';
    let body = call.init && call.init.body;
    if (body == null && typeof call.input !== 'string') {
      body = await call.input.clone().text();
    }
    return { url, method, body };
  }

  test('logs the shopper out when a request is unauthorized', async () => {
    store.dispatch(setCredentials({ name: 'Jane', email: 'jane@example.com' }));
    localStorage.setItem('cart', '{}');
    responseFactory = () => jsonResponse({ message: 'Not authorized' }, 401);

    await send(
      userApiSlice.endpoints.login.initiate({ email: 'a@b.c', password: 'x' })
    );

    expect(store.getState().auth.userInfo).toBeNull();
    expect(localStorage.getItem('userInfo')).toBeNull();
    expect(localStorage.getItem('cart')).toBeNull();
  });

  test('keeps the session for other error statuses', async () => {
    store.dispatch(setCredentials({ name: 'Jane' }));
    responseFactory = () => jsonResponse({ message: 'nope' }, 500);

    await send(userApiSlice.endpoints.getUsers.initiate());

    expect(store.getState().auth.userInfo).toEqual({ name: 'Jane' });
  });

  test.each([
    ['login', userApiSlice.endpoints.login, { email: 'a@b.c', password: 'secret' }, '/api/users/auth', 'POST'],
    ['register', userApiSlice.endpoints.register, { name: 'Jane', email: 'a@b.c', password: 'secret' }, '/api/users', 'POST'],
    ['logout', userApiSlice.endpoints.logout, undefined, '/api/users/logout', 'POST'],
    ['profile', userApiSlice.endpoints.profile, { name: 'Janet' }, '/api/users/profile', 'PUT'],
    ['getUsers', userApiSlice.endpoints.getUsers, undefined, '/api/users', 'GET'],
    ['deleteUser', userApiSlice.endpoints.deleteUser, 'user-1', '/api/users/user-1', 'DELETE'],
    ['getUserDetails', userApiSlice.endpoints.getUserDetails, 'user-1', '/api/users/user-1', 'GET'],
    ['updateUser', userApiSlice.endpoints.updateUser, { userId: 'user-1', name: 'Janet', isAdmin: true }, '/api/users/user-1', 'PUT'],
    ['getProducts', productsApiSlice.endpoints.getProducts, { keyword: 'phone', pageNumber: 2 }, '/api/products?keyword=phone&pageNumber=2', 'GET'],
    ['getProductDetails', productsApiSlice.endpoints.getProductDetails, 'product-1', '/api/products/product-1', 'GET'],
    ['createProduct', productsApiSlice.endpoints.createProduct, undefined, '/api/products', 'POST'],
    ['updateProduct', productsApiSlice.endpoints.updateProduct, { productId: 'product-1', price: 10 }, '/api/products/product-1', 'PUT'],
    ['uploadProductImage', productsApiSlice.endpoints.uploadProductImage, { image: 'file' }, '/api/upload', 'POST'],
    ['deleteProduct', productsApiSlice.endpoints.deleteProduct, 'product-1', '/api/products/product-1', 'DELETE'],
    ['createReview', productsApiSlice.endpoints.createReview, { productId: 'product-1', rating: 5, comment: 'Yes' }, '/api/products/product-1/reviews', 'POST'],
    ['getTopProducts', productsApiSlice.endpoints.getTopProducts, undefined, '/api/products/top', 'GET'],
    ['createOrder', orderApiSlice.endpoints.createOrder, { orderItems: [] }, '/api/orders', 'POST'],
    ['getOrderDetails', orderApiSlice.endpoints.getOrderDetails, 'order-1', '/api/orders/order-1', 'GET'],
    ['payOrder', orderApiSlice.endpoints.payOrder, { orderId: 'order-1', details: { id: 'PAY-1' } }, '/api/orders/order-1/pay', 'PUT'],
    ['getPaypalClientId', orderApiSlice.endpoints.getPaypalClientId, undefined, '/api/config/paypal', 'GET'],
    ['getMyOrders', orderApiSlice.endpoints.getMyOrders, undefined, '/api/orders/mine', 'GET'],
    ['getOrders', orderApiSlice.endpoints.getOrders, undefined, '/api/orders', 'GET'],
    ['deliverOrder', orderApiSlice.endpoints.deliverOrder, 'order-1', '/api/orders/order-1/deliver', 'PUT'],
  ])('%s hits the right endpoint', async (_name, endpoint, arg, expectedUrl, method) => {
    const result = await send(endpoint.initiate(arg));

    expect(result.url).toContain(expectedUrl);
    expect(result.method).toBe(method);
  });

  test('sends the login body as JSON', async () => {
    const { body } = await send(
      userApiSlice.endpoints.login.initiate({
        email: 'jane@example.com',
        password: 'secret',
      })
    );

    expect(body).toBe(
      JSON.stringify({ email: 'jane@example.com', password: 'secret' })
    );
  });
});
