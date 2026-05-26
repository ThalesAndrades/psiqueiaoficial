/**
 * Reference script for creating initial admin users.
 *
 * Passwords MUST be supplied via environment variables — never commit
 * literal credentials. Run with:
 *
 *   THALES_PASSWORD=... WESLEY_PASSWORD=... tsx scripts/create-initial-users.ts
 *
 * Account creation itself goes through the create-admin-user Edge Function or
 * the Supabase Dashboard. This file just documents the expected shape.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 12) {
    throw new Error(`${name} must be set in the environment (min 12 chars).`);
  }
  return value;
}

const user1 = {
  email: 'thales@psiqueia.com',
  password: requireEnv('THALES_PASSWORD'),
  fullName: 'Thales',
  userType: 'psychologist' as const,
  phone: '',
};

const user2 = {
  email: 'wesley@psiqueia.com',
  password: requireEnv('WESLEY_PASSWORD'),
  fullName: 'Wesley',
  userType: 'patient' as const,
  phone: '',
};

console.log('Initial users configuration loaded (passwords redacted):');
console.log('User 1:', { ...user1, password: '***' });
console.log('User 2:', { ...user2, password: '***' });
console.log('\nUse invitation codes registered in the database to complete signup.');
