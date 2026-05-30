/**
 * moderationService tests.
 *
 * Pina:
 *   1. createReport: deriva reporter_id do auth.getUser, passa para insert.
 *   2. createReport: rejeita quando não autenticado.
 *   3. reviewReport: faz update no report E insere moderation_action quando
 *      action é fornecida.
 *   4. reviewReport sem action: apenas atualiza o status.
 *   5. isAdmin: chama RPC is_admin e converte para boolean.
 *   6. getAccountStatus: chama RPC is_user_active e devolve o payload.
 *   7. Constantes REPORT_REASONS e MODERATION_ACTION_TYPES.
 */

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const insertMock = jest.fn();
const eqMock = jest.fn();
const updateMock = jest.fn(() => ({ eq: eqMock }));
const orderMock = jest.fn();
const selectMock = jest.fn();
const fromMock = jest.fn();
const getUserMock = jest.fn();
const rpcMock = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...(args as [])),
    auth: { getUser: () => getUserMock() },
    rpc: (...args: unknown[]) => rpcMock(...(args as [])),
  },
}));

jest.mock('../../services/loggerService', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod = require('../../services/moderationService');
const {
  moderationService,
  REPORT_REASONS,
  MODERATION_ACTION_TYPES,
  REPORT_REASON_LABEL,
} = mod;

beforeEach(() => {
  insertMock.mockReset();
  eqMock.mockReset();
  updateMock.mockClear();
  orderMock.mockReset();
  selectMock.mockReset();
  fromMock.mockReset();
  getUserMock.mockReset();
  rpcMock.mockReset();
});

describe('constants', () => {
  it('REPORT_REASONS tem 7 motivos canônicos', () => {
    expect(REPORT_REASONS).toHaveLength(7);
    expect(REPORT_REASONS).toEqual(
      expect.arrayContaining([
        'inappropriate_behavior',
        'harassment',
        'fraud',
        'fake_profile',
        'inappropriate_content',
        'ethical_violation',
        'other',
      ]),
    );
  });

  it('cada motivo tem label PT-BR mapeado', () => {
    for (const r of REPORT_REASONS) {
      expect(REPORT_REASON_LABEL[r]).toBeTruthy();
    }
  });

  it('MODERATION_ACTION_TYPES tem warning, suspension, ban', () => {
    expect(MODERATION_ACTION_TYPES).toEqual(['warning', 'suspension', 'ban']);
  });
});

describe('createReport', () => {
  it('deriva reporter_id do auth e insere a denúncia', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'reporter-1' } } });

    const single = jest.fn().mockResolvedValueOnce({ data: { id: 'report-1' }, error: null });
    selectMock.mockReturnValueOnce({ single });
    insertMock.mockReturnValueOnce({ select: selectMock });
    fromMock.mockReturnValueOnce({ insert: insertMock });

    const { data, error } = await moderationService.createReport(
      'target-1',
      'harassment',
      'descrição',
    );

    expect(fromMock).toHaveBeenCalledWith('user_reports');
    expect(insertMock).toHaveBeenCalledWith({
      reporter_id: 'reporter-1',
      reported_user_id: 'target-1',
      reason: 'harassment',
      description: 'descrição',
    });
    expect(data).toEqual({ id: 'report-1' });
    expect(error).toBeNull();
  });

  it('rejeita quando não autenticado', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const result = await moderationService.createReport('target-1', 'fraud');
    expect(result.data).toBeNull();
    expect(result.error).toBe('Não autenticado');
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('reviewReport', () => {
  it('atualiza status do report e insere moderation_action quando action é fornecida', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'admin-1' } } });

    // 1ª chamada from() — update do report
    eqMock.mockResolvedValueOnce({ error: null });
    fromMock.mockReturnValueOnce({ update: updateMock });
    // 2ª chamada from() — insert da action
    const insertMod = jest.fn().mockResolvedValueOnce({ error: null });
    fromMock.mockReturnValueOnce({ insert: insertMod });

    const { success, error } = await moderationService.reviewReport(
      'report-1',
      'target-1',
      'resolved',
      {
        reviewerNotes: 'comportamento confirmado',
        action: { type: 'suspension', reason: 'Suspensão 7 dias', expiresAt: '2026-06-08T00:00:00Z' },
      },
    );

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'resolved',
        reviewer_id: 'admin-1',
        reviewer_notes: 'comportamento confirmado',
      }),
    );
    expect(insertMod).toHaveBeenCalledWith(
      expect.objectContaining({
        target_user_id: 'target-1',
        report_id: 'report-1',
        action_type: 'suspension',
        reason: 'Suspensão 7 dias',
        expires_at: '2026-06-08T00:00:00Z',
        applied_by: 'admin-1',
      }),
    );
    expect(success).toBe(true);
    expect(error).toBeNull();
  });

  it('sem action, apenas atualiza o status do report', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'admin-1' } } });
    eqMock.mockResolvedValueOnce({ error: null });
    fromMock.mockReturnValueOnce({ update: updateMock });

    const { success } = await moderationService.reviewReport(
      'report-1',
      'target-1',
      'dismissed',
    );

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(success).toBe(true);
    // from() chamado só 1 vez (sem insert de action)
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});

describe('isAdmin / getAccountStatus', () => {
  it('isAdmin: rpc is_admin → boolean', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const { data } = await moderationService.isAdmin();
    expect(rpcMock).toHaveBeenCalledWith('is_admin');
    expect(data).toBe(true);
  });

  it('getAccountStatus: devolve payload da rpc is_user_active', async () => {
    const payload = { active: false, reason: 'Suspended', until: '2026-06-08', action_type: 'suspension' };
    rpcMock.mockResolvedValueOnce({ data: payload, error: null });
    const { data } = await moderationService.getAccountStatus();
    expect(rpcMock).toHaveBeenCalledWith('is_user_active');
    expect(data).toEqual(payload);
  });
});
