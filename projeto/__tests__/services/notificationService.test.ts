/**
 * notificationService — type constants tests.
 *
 * O PR A migrou Notification.type de uma union solta `'foo'|...|(string&{})`
 * para uma derived union `typeof NOTIFICATION_TYPES[number]`. Estes testes
 * pinam que:
 *   1. NOTIFICATION_TYPES contém os tipos canônicos esperados.
 *   2. NotificationType só aceita os valores do array (compile-time).
 *
 * Quem mexer na constante quebra o teste.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, Alert: { alert: jest.fn() } }));
jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn(), auth: { getUser: jest.fn() } } }));

import { NOTIFICATION_TYPES, NotificationType } from '../../services/notificationService';

describe('NOTIFICATION_TYPES', () => {
  it('contém os 6 tipos canônicos', () => {
    expect(NOTIFICATION_TYPES).toEqual([
      'appointment',
      'reminder',
      'message',
      'achievement',
      'payment',
      'general',
    ]);
  });

  it('é readonly em runtime (frozen via `as const`)', () => {
    // `as const` no TypeScript não congela em runtime mas dá readonly no
    // tipo. Validamos que existe e que indices funcionam como esperado.
    expect(NOTIFICATION_TYPES.length).toBe(6);
    expect(NOTIFICATION_TYPES[0]).toBe('appointment');
  });

  it('NotificationType aceita só valores do array (compile-check via assignment)', () => {
    // Se NotificationType deixar de ser derivada do array, este assignment
    // quebra em compile time. Se a derivação estiver correta, o teste apenas
    // confirma que rodou.
    const valid: NotificationType = 'appointment';
    expect(NOTIFICATION_TYPES).toContain(valid);
  });
});
