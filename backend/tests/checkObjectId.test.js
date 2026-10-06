import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import checkObjectId from '../middleware/checkObjectId.js';

function mockRes() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

describe('checkObjectId', () => {
  it('continues when the id is a valid ObjectId', () => {
    let called = false;
    const res = mockRes();

    checkObjectId(
      { params: { id: '507f1f77bcf86cd799439011' } },
      res,
      () => {
        called = true;
      }
    );

    assert.equal(called, true);
    assert.equal(res.statusCode, 200);
  });

  it('responds 404 and throws when the id is not an ObjectId', () => {
    const res = mockRes();
    let called = false;

    assert.throws(
      () =>
        checkObjectId({ params: { id: 'not-an-id' } }, res, () => {
          called = true;
        }),
      /Invalid ObjectId of:  not-an-id/
    );

    assert.equal(called, false);
    assert.equal(res.statusCode, 404);
  });
});
