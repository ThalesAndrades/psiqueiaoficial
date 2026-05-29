// Modo de teste / demo — permite rodar o app de ponta a ponta sem
// credenciais externas reais (Stripe, Daily.co, Anthropic).
//
// Ligue setando o secret `TEST_MODE=true` nas Edge Functions do Supabase
// (Project Settings → Edge Functions → Secrets). Quando ligado, cada
// função que dependeria de uma chave externa ausente retorna um mock
// determinístico e realista em vez de erro 500 — o fluxo do app continua.
//
// SEGURANÇA: em produção real, NÃO defina TEST_MODE (ou defina como
// qualquer valor != 'true'). Com TEST_MODE desligado, uma credencial
// ausente volta a falhar de forma explícita (500), como deve ser — assim
// um deploy de produção sem chave nunca processa pagamentos/vídeo/IA
// "fake" silenciosamente.

export function isTestMode(): boolean {
  return Deno.env.get('TEST_MODE') === 'true';
}

// Cabeçalho que marca toda resposta mockada, para inspeção no cliente /
// nos logs ("esta resposta veio do modo teste, não de um provedor real").
export const TEST_MODE_HEADER = 'X-PsiqueIA-Test-Mode';
