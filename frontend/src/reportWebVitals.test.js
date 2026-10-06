import reportWebVitals from './reportWebVitals';

jest.mock('web-vitals', () => ({
  getCLS: jest.fn(),
  getFID: jest.fn(),
  getFCP: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
}));

describe('reportWebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ignores a missing or non-function callback', async () => {
    const webVitals = require('web-vitals');

    expect(reportWebVitals()).toBeUndefined();
    expect(reportWebVitals('not a function')).toBeUndefined();
    await Promise.resolve();

    expect(webVitals.getCLS).not.toHaveBeenCalled();
    expect(webVitals.getFID).not.toHaveBeenCalled();
    expect(webVitals.getFCP).not.toHaveBeenCalled();
    expect(webVitals.getLCP).not.toHaveBeenCalled();
    expect(webVitals.getTTFB).not.toHaveBeenCalled();
  });

  test('loads web-vitals and forwards the callback', async () => {
    const webVitals = require('web-vitals');
    const callback = jest.fn();

    await reportWebVitals(callback);

    expect(webVitals.getCLS).toHaveBeenCalledWith(callback);
    expect(webVitals.getFID).toHaveBeenCalledWith(callback);
    expect(webVitals.getFCP).toHaveBeenCalledWith(callback);
    expect(webVitals.getLCP).toHaveBeenCalledWith(callback);
    expect(webVitals.getTTFB).toHaveBeenCalledWith(callback);
  });
});