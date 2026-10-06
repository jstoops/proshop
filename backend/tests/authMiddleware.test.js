import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { admin, protect } from '../middleware/authMiddleware.js';
import User from '../models/userModel.js';

process.env.JWT_SECRET = 'auth-middleware-secret';

function mockRes() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

describe('admin', () => {
  it('continues for an admin user', () => {
    let called = false;
    admin({ user: { isAdmin: true } }, mockRes(), () => {
      called = true;
    });
    assert.equal(called, true);
  });

  it('rejects signed-in users who are not admins', () => {
    const res = mockRes();
    assert.throws(
      () => admin({ user: { isAdmin: false } }, res, () => {}),
      /Not authorized as an admin/
    );
    assert.equal(res.statusCode, 401);
  });

  it('rejects requests with no user', () => {
    const res = mockRes();
    assert.throws(() => admin({}, res, () => {}), /Not authorized as an admin/);
    assert.equal(res.statusCode, 401);
  });
});

describe('protect', () => {
  it('loads the user from a valid jwt cookie and strips the password', async (t) => {
    const user = { _id: '507f1f77bcf86cd799439011', name: 'Jane', isAdmin: false };
    t.mock.method(User, 'findById', (id) => {
      assert.equal(id, user._id);
      return {
        select(projection) {
          assert.equal(projection, '-password');
          return Promise.resolve(user);
        },
      };
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const req = { cookies: { jwt: token } };
    let called = false;

    await protect(req, mockRes(), () => {
      called = true;
    });

    assert.equal(called, true);
    assert.equal(req.user, user);
  });

  it('rejects a missing token', async () => {
    const res = mockRes();
    const calls = [];

    await protect({ cookies: {} }, res, (err) => calls.push(err));

    assert.equal(res.statusCode, 401);
    assert.equal(calls[0].message, 'Not authorized, no token');
  });

  it('rejects a token that cannot be verified', async (t) => {
    t.mock.method(console, 'error', () => {});
    const res = mockRes();
    const calls = [];

    await protect({ cookies: { jwt: 'not-a-token' } }, res, (err) => calls.push(err));

    assert.equal(res.statusCode, 401);
    assert.equal(calls[0].message, 'Not authorized, token failed');
  });

  it('continues with a null user when the token subject was deleted', async (t) => {
    t.mock.method(User, 'findById', () => ({
      select: () => Promise.resolve(null),
    }));

    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
    const req = { cookies: { jwt: token } };
    let called = false;

    await protect(req, mockRes(), () => {
      called = true;
    });

    assert.equal(called, true);
    assert.equal(req.user, null);
  });
});
