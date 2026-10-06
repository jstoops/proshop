import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import generateToken from '../utils/generateToken.js';

const originalEnv = process.env.NODE_ENV;

describe('generateToken', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('sets an httpOnly jwt cookie that expires in 30 days', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'test-secret';

    const res = {
      cookie(name, token, options) {
        this.name = name;
        this.token = token;
        this.options = options;
      },
    };

    generateToken(res, 'user-1');

    const decoded = jwt.verify(res.token, process.env.JWT_SECRET);
    assert.equal(res.name, 'jwt');
    assert.equal(decoded.userId, 'user-1');
    assert.equal(decoded.exp - decoded.iat, 30 * 24 * 60 * 60);
    assert.equal(res.options.httpOnly, true);
    assert.equal(res.options.secure, false);
    assert.equal(res.options.sameSite, 'strict');
    assert.equal(res.options.maxAge, 30 * 24 * 60 * 60 * 1000);
  });

  it('marks the cookie secure outside development', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';

    const res = {
      cookie(name, token, options) {
        this.options = options;
      },
    };

    generateToken(res, 'user-1');
    assert.equal(res.options.secure, true);
  });
});
