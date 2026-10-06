import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import asyncHandler from '../middleware/asyncHandler.js';

describe('asyncHandler', () => {
  it('runs the wrapped handler and forwards a successful next call', async () => {
    const calls = [];
    const wrapped = asyncHandler(async (req, res, next) => {
      calls.push(req.id);
      next();
    });

    await wrapped({ id: 'req' }, {}, (err) => calls.push(err));

    assert.deepEqual(calls, ['req', undefined]);
  });

  it('passes async failures to next', async () => {
    const error = new Error('boom');
    const wrapped = asyncHandler(async () => {
      throw error;
    });
    const calls = [];

    await wrapped({}, {}, (err) => calls.push(err));

    assert.deepEqual(calls, [error]);
  });
});
