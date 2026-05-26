/**
 * Logger is Deno-flavored (filename ends with .ts on imports) but the
 * implementation itself is plain ESM that only touches JSON, Date, and
 * console — safe to load directly under Jest.
 */
import { createLogger } from '../../supabase/functions/_shared/logger';

function captureLog(level: 'info' | 'warn' | 'error') {
  const method = level === 'info' ? 'log' : level;
  return jest.spyOn(console, method as any).mockImplementation(() => {});
}

describe('createLogger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('emits a JSON line with ts/level/fn/msg', () => {
    const spy = captureLog('info');
    const log = createLogger('test-fn');
    log.info('hello', { userId: 'u1' });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload).toMatchObject({ level: 'info', fn: 'test-fn', msg: 'hello', userId: 'u1' });
    expect(typeof payload.ts).toBe('string');
  });

  it('serializes Error objects with name, message, stack, and own props', () => {
    const spy = captureLog('error');
    const log = createLogger('test-fn');
    const err = new Error('card_declined') as Error & { code?: string; decline_code?: string };
    err.code = 'card_declined';
    err.decline_code = 'insufficient_funds';

    log.error('payment failed', { error: err });
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.error).toMatchObject({
      name: 'Error',
      message: 'card_declined',
      code: 'card_declined',
      decline_code: 'insufficient_funds',
    });
    expect(typeof payload.error.stack).toBe('string');
  });

  it('handles circular references with [Circular] instead of throwing', () => {
    const spy = captureLog('warn');
    const log = createLogger('test-fn');
    const a: any = { name: 'a' };
    const b: any = { name: 'b', a };
    a.b = b;

    expect(() => log.warn('cycle', { a })).not.toThrow();
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(JSON.stringify(payload)).toContain('[Circular]');
  });

  it('coerces BigInt to a decimal string', () => {
    const spy = captureLog('info');
    const log = createLogger('test-fn');
    log.info('big', { amount: 12345678901234567890n });
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.amount).toBe('12345678901234567890');
  });

  it('child() merges base context with per-call meta', () => {
    const spy = captureLog('info');
    const log = createLogger('test-fn').child({ requestId: 'r-1' });
    log.info('msg', { userId: 'u1' });
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload).toMatchObject({ requestId: 'r-1', userId: 'u1', msg: 'msg' });
  });
});
