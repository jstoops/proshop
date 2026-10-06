import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CartScreen from './CartScreen';
import { makeStore } from '../testUtils';

const phone = {
  _id: 'p1',
  name: 'Phone',
  image: '/images/phone.jpg',
  price: 100,
  countInStock: 3,
  qty: 1,
};

function Location() {
  const location = useLocation();
  return <div data-testid="loc">{`${location.pathname}${location.search}`}</div>;
}

function renderCart(cartItems) {
  const store = makeStore({
    auth: { userInfo: null },
    cart: {
      cartItems,
      shippingAddress: {},
      paymentMethod: 'PayPal',
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<CartScreen />} />
          <Route path="/login" element={<Location />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

  return store;
}

describe('CartScreen', () => {
  test('shows an empty cart and disables checkout', () => {
    renderCart([]);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go back/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeDisabled();
    expect(screen.getByRole('heading', { name: /subtotal \(0\) items/i })).toBeInTheDocument();
  });

  test('updates quantity, removes a line, and continues to shipping', () => {
    const store = renderCart([phone]);

    expect(screen.getByRole('link', { name: 'Phone' })).toHaveAttribute(
      'href',
      '/product/p1'
    );
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });

    expect(store.getState().cart.cartItems[0].qty).toBe(2);
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /subtotal \(2\) items/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/login?redirect=/shipping');
  });

  test('removes the last item', () => {
    const store = renderCart([phone]);
    const removeButton = screen
      .getAllByRole('button')
      .find((button) => button.querySelector('svg'));

    fireEvent.click(removeButton);

    expect(store.getState().cart.cartItems).toEqual([]);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });
});
