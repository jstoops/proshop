import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Header from './Header';
import { makeStore } from '../testUtils';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderHeader(preloadedState) {
  const store = makeStore(preloadedState);
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Header />} />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/profile" element={<div>Profile page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
}

const emptyCart = {
  cartItems: [],
  shippingAddress: {},
  paymentMethod: 'PayPal',
};

describe('Header', () => {
  let store;

  beforeEach(() => {
    localStorage.clear();
    const fetchMock = jest.fn(async () =>
      jsonResponse({ message: 'Logged out successfully' })
    );
    global.fetch = fetchMock;
    window.fetch = fetchMock;
  });

  test('shows a sign-in link and no cart badge when nobody is shopping', () => {
    store = renderHeader({
      auth: { userInfo: null },
      cart: emptyCart,
    });

    expect(screen.getByRole('link', { name: 'JDSCraft' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  test('sums the cart and shows admin links for an admin', () => {
    store = renderHeader({
      auth: { userInfo: { name: 'Ada', isAdmin: true } },
      cart: {
        cartItems: [
          { _id: '1', qty: 2 },
          { _id: '2', qty: 3 },
        ],
        shippingAddress: {},
        paymentMethod: 'PayPal',
      },
    });

    expect(screen.getByText('5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      '/admin/productlist'
    );
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'href',
      '/admin/orderlist'
    );
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/admin/userlist'
    );
  });

  test('opens the profile page from the account menu', () => {
    store = renderHeader({
      auth: { userInfo: { name: 'Jane', isAdmin: false } },
      cart: emptyCart,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Jane' }));
    fireEvent.click(screen.getByRole('link', { name: 'Profile' }));

    expect(screen.getByText('Profile page')).toBeInTheDocument();
  });

  test('logs out, clears the cart, and opens the login page', async () => {
    localStorage.setItem('userInfo', JSON.stringify({ name: 'Jane' }));
    localStorage.setItem('cart', JSON.stringify({ cartItems: [{ _id: '1' }] }));
    store = renderHeader({
      auth: { userInfo: { name: 'Jane', isAdmin: false } },
      cart: {
        cartItems: [{ _id: '1', name: 'Phone', price: 10, qty: 1, image: '/p.jpg' }],
        shippingAddress: { city: 'Boston' },
        paymentMethod: 'Card',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Jane' }));
    fireEvent.click(screen.getByText('Logout'));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(store.getState().auth.userInfo).toBeNull();
    expect(store.getState().cart).toEqual(emptyCart);
    expect(localStorage.getItem('userInfo')).toBeNull();
    expect(global.fetch).toHaveBeenCalled();
  });

  test('stays signed in when logout fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    });
    window.fetch = global.fetch;
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    store = renderHeader({
      auth: { userInfo: { name: 'Jane', isAdmin: false } },
      cart: emptyCart,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Jane' }));
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(error).toHaveBeenCalled();
    });
    expect(store.getState().auth.userInfo.name).toBe('Jane');
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    error.mockRestore();
  });
});
