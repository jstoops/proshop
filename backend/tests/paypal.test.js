import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.PAYPAL_CLIENT_ID = 'client-id';
process.env.PAYPAL_APP_SECRET = 'app-secret';
process.env.PAYPAL_API_URL = 'https://paypal.example';

const { checkIfNewTransaction, verifyPayPalPayment } = await import(
  '../utils/paypal.js'
);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verifyPayPalPayment', () => {
  it('exchanges client credentials and reports a completed capture', async (t) => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/v1/oauth2/token')) {
        return jsonResponse({ access_token: 'token-123' });
      }
      return jsonResponse({
        status: 'COMPLETED',
        purchase_units: [{ amount: { value: '67.50' } }],
      });
    });

    const result = await verifyPayPalPayment('TX1');

    assert.deepEqual(result, { verified: true, value: '67.50' });
    assert.equal(calls[0].url, 'https://paypal.example/v1/oauth2/token');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.body, 'grant_type=client_credentials');
    assert.equal(
      calls[0].options.headers.Authorization,
      `Basic ${Buffer.from('client-id:app-secret').toString('base64')}`
    );
    assert.equal(
      calls[1].url,
      'https://paypal.example/v2/checkout/orders/TX1'
    );
    assert.equal(calls[1].options.headers.Authorization, 'Bearer token-123');
  });

  it('reports unverified when the PayPal order is not completed', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url) => {
      if (String(url).includes('/v1/oauth2/token')) {
        return jsonResponse({ access_token: 'token-123' });
      }
      return jsonResponse({
        status: 'CREATED',
        purchase_units: [{ amount: { value: '10.00' } }],
      });
    });

    const result = await verifyPayPalPayment('TX2');
    assert.deepEqual(result, { verified: false, value: '10.00' });
  });

  it('throws when the access token request fails', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => jsonResponse({}, 401));

    await assert.rejects(
      verifyPayPalPayment('TX3'),
      /Failed to get access token/
    );
  });

  it('throws when the order lookup fails', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url) => {
      if (String(url).includes('/v1/oauth2/token')) {
        return jsonResponse({ access_token: 'token-123' });
      }
      return jsonResponse({}, 404);
    });

    await assert.rejects(verifyPayPalPayment('TX4'), /Failed to verify payment/);
  });
});

describe('checkIfNewTransaction', () => {
  it('is new when no order has used the transaction id', async () => {
    const seen = [];
    const orderModel = {
      async find(query) {
        seen.push(query);
        return [];
      },
    };

    assert.equal(await checkIfNewTransaction(orderModel, 'tx-new'), true);
    assert.deepEqual(seen, [{ 'paymentResult.id': 'tx-new' }]);
  });

  it('is not new when an order already stored the transaction id', async () => {
    const orderModel = {
      async find() {
        return [{ _id: 'order-1' }];
      },
    };

    assert.equal(await checkIfNewTransaction(orderModel, 'tx-old'), false);
  });

  it('swallows query errors and returns undefined', async (t) => {
    const logged = [];
    t.mock.method(console, 'error', (...args) => logged.push(args));
    const orderModel = {
      async find() {
        throw new Error('db down');
      },
    };

    assert.equal(await checkIfNewTransaction(orderModel, 'tx'), undefined);
    assert.equal(logged.length, 1);
    assert.match(String(logged[0][0]), /db down/);
  });
});
