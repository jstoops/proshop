import cartReducer, {
  addToCart,
  clearCartItems,
  removeFromCart,
  resetCart,
  savePaymentMethod,
  saveShippingAddress,
} from './cartSlice';

const emptyCart = {
  cartItems: [],
  shippingAddress: {},
  paymentMethod: 'PayPal',
};

const phone = {
  _id: 'p1',
  name: 'Phone',
  image: '/images/phone.jpg',
  price: 40,
  countInStock: 4,
  qty: 1,
  user: 'user-1',
  rating: 5,
  numReviews: 2,
  reviews: [{ comment: 'Nice' }],
};

describe('cartSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('adds a product without catalog-only fields and prices the cart', () => {
    const state = cartReducer(emptyCart, addToCart(phone));

    expect(state.cartItems).toEqual([
      {
        _id: 'p1',
        name: 'Phone',
        image: '/images/phone.jpg',
        price: 40,
        countInStock: 4,
        qty: 1,
      },
    ]);
    expect(state.shippingPrice).toBe('10.00');
    expect(state.totalPrice).toBe('56.00');
    expect(JSON.parse(localStorage.getItem('cart')).cartItems).toHaveLength(1);
  });

  test('replaces an existing line and appends a different product', () => {
    const withPhone = cartReducer(emptyCart, addToCart(phone));
    const updated = cartReducer(withPhone, addToCart({ ...phone, qty: 3 }));
    const withCable = cartReducer(
      updated,
      addToCart({
        _id: 'p2',
        name: 'Cable',
        image: '/images/cable.jpg',
        price: 10,
        qty: 1,
      })
    );

    expect(updated.cartItems).toHaveLength(1);
    expect(updated.cartItems[0].qty).toBe(3);
    expect(updated.itemsPrice).toBe('120.00');
    expect(updated.shippingPrice).toBe('0.00');
    expect(withCable.cartItems.map((item) => item._id)).toEqual(['p1', 'p2']);
  });

  test('removes a line and recalculates the totals', () => {
    const start = cartReducer(
      cartReducer(emptyCart, addToCart(phone)),
      addToCart({
        _id: 'p2',
        name: 'Cable',
        image: '/images/cable.jpg',
        price: 10,
        qty: 2,
      })
    );

    const state = cartReducer(start, removeFromCart('p1'));

    expect(state.cartItems.map((item) => item._id)).toEqual(['p2']);
    expect(state.itemsPrice).toBe('20.00');
    expect(state.shippingPrice).toBe('10.00');
  });

  test('saves the shipping address and payment method', () => {
    const address = {
      address: '1 Main St',
      city: 'Boston',
      postalCode: '02101',
      country: 'USA',
    };
    const withAddress = cartReducer(emptyCart, saveShippingAddress(address));
    const withPayment = cartReducer(withAddress, savePaymentMethod('Card'));

    expect(withPayment.shippingAddress).toEqual(address);
    expect(withPayment.paymentMethod).toBe('Card');
    expect(JSON.parse(localStorage.getItem('cart')).paymentMethod).toBe('Card');
  });

  test('clears the line items without recomputing saved prices', () => {
    const start = {
      ...emptyCart,
      cartItems: [{ _id: 'p1', price: 40, qty: 1 }],
      itemsPrice: '40.00',
      shippingPrice: '10.00',
      taxPrice: '6.00',
      totalPrice: '56.00',
    };

    const state = cartReducer(start, clearCartItems());

    expect(state.cartItems).toEqual([]);
    expect(state.totalPrice).toBe('56.00');
    expect(JSON.parse(localStorage.getItem('cart')).cartItems).toEqual([]);
  });

  test('loads a saved cart and resetCart replaces it with an empty cart', () => {
    const saved = {
      cartItems: [{ _id: 'p9', name: 'Mouse', price: 20, qty: 1, image: '/m.jpg' }],
      shippingAddress: { city: 'Austin' },
      paymentMethod: 'Card',
      itemsPrice: '20.00',
    };
    localStorage.setItem('cart', JSON.stringify(saved));

    let isolatedReducer;
    let isolatedReset;
    jest.isolateModules(() => {
      const slice = require('./cartSlice');
      isolatedReducer = slice.default;
      isolatedReset = slice.resetCart;
    });

    const loaded = isolatedReducer(undefined, { type: 'unknown' });
    expect(loaded.cartItems).toEqual(saved.cartItems);
    expect(loaded.shippingAddress).toEqual({ city: 'Austin' });

    const reset = isolatedReducer(loaded, isolatedReset());
    expect(reset).toEqual(emptyCart);
    expect(JSON.parse(localStorage.getItem('cart'))).toEqual(emptyCart);
  });
});
