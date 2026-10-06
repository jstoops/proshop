import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import { makeStore } from './testUtils';

function renderApp(preloadedState) {
  const store = makeStore(preloadedState);
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<div>Home content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
}

const signedIn = {
  auth: { userInfo: { name: 'Jane', email: 'jane@example.com', isAdmin: false } },
  cart: { cartItems: [], shippingAddress: {}, paymentMethod: 'PayPal' },
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders the shop shell around the current page', () => {
    renderApp({
      auth: { userInfo: null },
      cart: { cartItems: [], shippingAddress: {}, paymentMethod: 'PayPal' },
    });

    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JDSCraft' })).toBeInTheDocument();
    expect(
      screen.getByText(`JDSCraft © ${new Date().getFullYear()}`)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  test('logs out when the saved session is already expired', async () => {
    localStorage.setItem('userInfo', JSON.stringify(signedIn.auth.userInfo));
    localStorage.setItem('expirationTime', String(Date.now() - 1000));
    localStorage.setItem('cart', '{}');

    const store = renderApp(signedIn);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
    expect(store.getState().auth.userInfo).toBeNull();
    expect(localStorage.getItem('userInfo')).toBeNull();
    expect(localStorage.getItem('expirationTime')).toBeNull();
    expect(localStorage.getItem('cart')).toBeNull();
  });

  test('keeps a session that expires in the future', async () => {
    localStorage.setItem('expirationTime', String(Date.now() + 60 * 1000));
    const store = renderApp(signedIn);

    expect(screen.getByRole('button', { name: 'Jane' })).toBeInTheDocument();
    await waitFor(() => {
      expect(store.getState().auth.userInfo.name).toBe('Jane');
    });
  });

  test('keeps a session that has no expiration stored', () => {
    const store = renderApp(signedIn);
    expect(screen.getByRole('button', { name: 'Jane' })).toBeInTheDocument();
    expect(store.getState().auth.userInfo.name).toBe('Jane');
  });
});
