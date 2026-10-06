import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler, notFound } from '../middleware/errorMiddleware.js';

const originalEnv = process.env.NODE_ENV;

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
    },
  };
}

describe('error middleware', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('turns an unknown url into a 404 error', () => {
    const res = mockRes();
    let forwarded;

    notFound({ originalUrl: '/missing' }, res, (error) => {
      forwarded = error;
    });

    assert.equal(res.statusCode, 404);
    assert.equal(forwarded.message, 'Not Found - /missing');
  });

  it('uses 500 when a handler left the status at the default 200', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const error = new Error('explode');

    errorHandler(error, {}, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'explode');
    assert.equal(res.body.stack, error.stack);
  });

  it('keeps an explicit error status', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    res.status(400);

    errorHandler(new Error('bad input'), {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'bad input');
  });

  it('hides the stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    res.status(404);

    errorHandler(new Error('missing'), {}, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.stack, null);
  });
});
