import {
  isValidEmail,
  isValidUUID,
  isValidAmount,
  sanitizeString,
  handleServiceError,
  safeAsync,
} from '../../utils/errorHandler';

describe('isValidEmail', () => {
  it.each([
    ['user@example.com', true],
    ['first.last+tag@sub.example.co', true],
    ['user@example', false],
    ['no-at-sign', false],
    ['user@.com', false],
    ['', false],
    ['  user@example.com  ', false], // no trimming; trim at the call site
  ])('returns %s for %p', (input, expected) => {
    expect(isValidEmail(input)).toBe(expected);
  });
});

describe('isValidUUID', () => {
  it('accepts a canonical v4 UUID', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });
  it('rejects malformed UUIDs', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('isValidAmount', () => {
  it('accepts positive finite numbers', () => {
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(150)).toBe(true);
  });
  it('rejects zero, negative, NaN, Infinity', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('trims, strips angle brackets, and caps length at 10k', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeString('a'.repeat(20000)).length).toBe(10000);
  });
});

describe('handleServiceError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns Error.message for plain Error', async () => {
    expect(await handleServiceError(new Error('boom'), 'ctx')).toBe('boom');
  });
  it('returns the string itself when the value is a string', async () => {
    expect(await handleServiceError('something bad', 'ctx')).toBe('something bad');
  });
  it('falls back to a friendly message for unknown shapes', async () => {
    expect(await handleServiceError({ weird: true }, 'ctx')).toMatch(/erro inesperado/i);
  });
});

describe('safeAsync', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns { data, error: null } on success', async () => {
    const result = await safeAsync(async () => 42, 'test');
    expect(result).toEqual({ data: 42, error: null });
  });
  it('returns { data: null, error } when the operation throws', async () => {
    const result = await safeAsync(async () => {
      throw new Error('nope');
    }, 'test');
    expect(result.data).toBeNull();
    expect(result.error).toBe('nope');
  });
});
