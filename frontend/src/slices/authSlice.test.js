import authReducer, { logout, setCredentials } from './authSlice';

const jane = {
  _id: 'u1',
  name: 'Jane',
  email: 'jane@example.com',
  isAdmin: false,
};

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('stores credentials in state and localStorage', () => {
    const state = authReducer({ userInfo: null }, setCredentials(jane));

    expect(state.userInfo).toEqual(jane);
    expect(JSON.parse(localStorage.getItem('userInfo'))).toEqual(jane);
  });

  test('logout clears the user and everything saved in the browser', () => {
    localStorage.setItem('userInfo', JSON.stringify(jane));
    localStorage.setItem('cart', JSON.stringify({ cartItems: [{ _id: 'p1' }] }));
    localStorage.setItem('expirationTime', '123');

    const state = authReducer({ userInfo: jane }, logout());

    expect(state.userInfo).toBeNull();
    expect(localStorage.getItem('userInfo')).toBeNull();
    expect(localStorage.getItem('cart')).toBeNull();
    expect(localStorage.getItem('expirationTime')).toBeNull();
  });

  test('reads an existing session when the store is created', () => {
    localStorage.setItem('userInfo', JSON.stringify(jane));

    let isolatedReducer;
    jest.isolateModules(() => {
      isolatedReducer = require('./authSlice').default;
    });

    expect(isolatedReducer(undefined, { type: 'unknown' }).userInfo).toEqual(jane);
  });
});
