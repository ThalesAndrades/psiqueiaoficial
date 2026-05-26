// Allowed origins are configured via the ALLOWED_ORIGINS env var (comma-
// separated). When unset we fall back to the deployed app domains. Wildcard
// '*' is intentionally NOT used: combined with Authorization bearer tokens
// stored in browser localStorage on web, a wildcard CORS lets any malicious
// site call our Edge Functions from a logged-in user's session.
const DEFAULT_ALLOWED_ORIGINS = [
  'https://psiqueia.com',
  'https://www.psiqueia.com',
  'https://app.psiqueia.com',
  'http://localhost:8081',
  'http://localhost:19006',
];

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const effectiveAllowed = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

const baseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
};

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  // Native mobile clients (Expo, React Native) do not send an Origin header.
  // Allow those through with no ACAO header (browsers are the only consumers
  // CORS protects against). For web origins, only echo back known ones.
  if (!origin) return { ...baseHeaders };
  if (effectiveAllowed.includes(origin)) {
    return { ...baseHeaders, 'Access-Control-Allow-Origin': origin };
  }
  return { ...baseHeaders };
}

// Back-compat export. Callers that don't have access to the Request still get
// a safe header set (no ACAO), which blocks browser-based abuse by default.
export const corsHeaders = { ...baseHeaders };
