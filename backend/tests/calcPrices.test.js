import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcPrices } from '../utils/calcPrices.js';

describe('calcPrices', () => {
  it('charges shipping and 15% tax under the free-shipping threshold', () => {
    assert.deepEqual(calcPrices([{ price: 50, qty: 1 }]), {
      itemsPrice: '50.00',
      shippingPrice: '10.00',
      taxPrice: '7.50',
      totalPrice: '67.50',
    });
  });

  it('still charges shipping when the items total is exactly 100', () => {
    assert.deepEqual(calcPrices([{ price: 25, qty: 4 }]), {
      itemsPrice: '100.00',
      shippingPrice: '10.00',
      taxPrice: '15.00',
      totalPrice: '125.00',
    });
  });

  it('waives shipping once the items total is over 100', () => {
    assert.deepEqual(calcPrices([{ price: 100.01, qty: 1 }]), {
      itemsPrice: '100.01',
      shippingPrice: '0.00',
      taxPrice: '15.00',
      totalPrice: '115.01',
    });
  });

  it('sums multiple line items and rounds each money field to cents', () => {
    assert.deepEqual(
      calcPrices([
        { price: 25, qty: 2 },
        { price: 10.5, qty: 1 },
      ]),
      {
        itemsPrice: '60.50',
        shippingPrice: '10.00',
        taxPrice: '9.07',
        totalPrice: '79.58',
      }
    );
  });

  it('treats an empty order as a zero-item cart that still pays shipping', () => {
    assert.deepEqual(calcPrices([]), {
      itemsPrice: '0.00',
      shippingPrice: '10.00',
      taxPrice: '0.00',
      totalPrice: '10.00',
    });
  });
});
