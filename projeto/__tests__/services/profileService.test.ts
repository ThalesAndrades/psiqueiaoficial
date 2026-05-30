/**
 * profileService Zod boundary tests.
 *
 * The PR A migrated `getUserProfile` from `data as UserProfile` (cast that
 * lies in runtime) to `UserProfileSchema.safeParse(data)`. These tests
 * pin that contract:
 *   1. Valid Supabase row → returns parsed data, no error.
 *   2. Mismatched row (missing required field) → returns null + error,
 *      does NOT crash the consumer.
 *   3. Supabase error → returns null + error string.
 *   4. No row found (data === null) → returns null + 'Perfil não
 *      encontrado'.
 *
 * Goal: catch regressions where someone removes the safeParse and
 * reintroduces the silent cast.
 */

const eqMock = jest.fn();
const maybeSingleMock = jest.fn();
const selectMock = jest.fn(() => ({ eq: eqMock }));
const fromMock = jest.fn(() => ({ select: selectMock }));

jest.mock('../../lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [])) },
}));

jest.mock('../../services/loggerService', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// profileService importa Platform de react-native (usado por outras
// funções do módulo; getUserProfile não usa). Mock só o que precisamos
// para o módulo carregar sob node-only testEnvironment.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { profileService } = require('../../services/profileService');

function wireSupabaseReturn(data: unknown, error: { message: string; code?: string } | null) {
  maybeSingleMock.mockResolvedValueOnce({ data, error });
  eqMock.mockReturnValueOnce({ maybeSingle: maybeSingleMock });
}

describe('profileService.getUserProfile — Zod boundary', () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it('returns parsed data when the row matches UserProfileSchema', async () => {
    wireSupabaseReturn(
      {
        id: '11111111-2222-3333-4444-555555555555',
        email: 'alice@example.com',
        full_name: 'Alice',
        user_type: 'patient',
        onboarding_completed: true,
        created_at: '2026-05-29T00:00:00Z',
        updated_at: '2026-05-29T00:00:00Z',
      },
      null,
    );

    const result = await profileService.getUserProfile('11111111-2222-3333-4444-555555555555');

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      id: '11111111-2222-3333-4444-555555555555',
      email: 'alice@example.com',
      user_type: 'patient',
    });
  });

  it('rejects rows that fail the Zod schema (missing user_type)', async () => {
    wireSupabaseReturn(
      {
        id: '11111111-2222-3333-4444-555555555555',
        email: 'alice@example.com',
        full_name: 'Alice',
        // user_type intentionally missing — Zod must reject
        onboarding_completed: true,
        created_at: '2026-05-29T00:00:00Z',
        updated_at: '2026-05-29T00:00:00Z',
      },
      null,
    );

    const result = await profileService.getUserProfile('11111111-2222-3333-4444-555555555555');

    expect(result.data).toBeNull();
    expect(result.error).toContain('inválido');
  });

  it('rejects rows with invalid enum value for user_type', async () => {
    wireSupabaseReturn(
      {
        id: '11111111-2222-3333-4444-555555555555',
        email: 'alice@example.com',
        full_name: 'Alice',
        user_type: 'admin', // not in the enum — Zod must reject
        onboarding_completed: true,
        created_at: '2026-05-29T00:00:00Z',
        updated_at: '2026-05-29T00:00:00Z',
      },
      null,
    );

    const result = await profileService.getUserProfile('11111111-2222-3333-4444-555555555555');

    expect(result.data).toBeNull();
    expect(result.error).toContain('inválido');
  });

  it('returns Supabase error message when the query fails', async () => {
    wireSupabaseReturn(null, { message: 'connection refused' });

    const result = await profileService.getUserProfile('11111111-2222-3333-4444-555555555555');

    expect(result.data).toBeNull();
    expect(result.error).toBe('connection refused');
  });

  it('returns "Perfil não encontrado" when no row is returned', async () => {
    wireSupabaseReturn(null, null);

    const result = await profileService.getUserProfile('11111111-2222-3333-4444-555555555555');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Perfil não encontrado');
  });
});
