import { addDecimals, updateCart } from './cartUtils';

describe('addDecimals', () => {
  test('rounds half up to two decimal places', () => {
    expect(addDecimals(10.454)).toBe('10.45');
    expect(addDecimals(10.456)).toBe('10.46');
    expect(addDecimals(10)).toBe('10.00');
  });
});

describe('updateCart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('charges shipping and tax for a small cart and saves it', () => {
    const state = {
      cartItems: [{ price: 50, qty: 1 }],
      shippingAddress: {},
      paymentMethod: 'PayPal',
    };

    const updated = updateCart(state);

    expect(updated).toBe(state);
    expect(state).toMatchObject({
      itemsPrice: '50.00',
      shippingPrice: '10.00',
      taxPrice: '7.50',
      totalPrice: '67.50',
    });
    expect(JSON.parse(localStorage.getItem('cart'))).toMatchObject({
      itemsPrice: '50.00',
      totalPrice: '67.50',
    });
  });

  test('keeps shipping at exactly 100 and waives it above that', () => {
    const atThreshold = updateCart({
      cartItems: [{ price: 25, qty: 4 }],
    });
    expect(atThreshold.shippingPrice).toBe('10.00');
    expect(atThreshold.totalPrice).toBe('125.00');

    const overThreshold = updateCart({
      cartItems: [{ price: 100.01, qty: 1 }],
    });
    expect(overThreshold.shippingPrice).toBe('0.00');
    expect(overThreshold.taxPrice).toBe('15.00');
    expect(overThreshold.totalPrice).toBe('115.01');
  });

  test('sums mixed line items and rounds to cents', () => {
    const state = updateCart({
      cartItems: [
        { price: 25, qty: 2 },
        { price: 10.5, qty: 1 },
      ],
    });

    expect(state).toMatchObject({
      itemsPrice: '60.50',
      shippingPrice: '10.00',
      taxPrice: '9.07',
      totalPrice: '79.58',
    });
  });
});
