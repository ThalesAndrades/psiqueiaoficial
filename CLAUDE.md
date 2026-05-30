# CLAUDE.md — PsiquèIA codebase navigation

App de telessaúde mental brasileiro (psicólogo + paciente) construído com Expo (React Native) e Supabase. Este arquivo orienta agentes futuros (e humanos novos) sobre onde está o quê e por quê.

## Layout do repo

```
/                                 # raiz
├── projeto/                      # app Expo (cwd para tudo)
│   ├── app/                      # rotas expo-router
│   │   ├── (patient)/            # screens do papel "paciente"
│   │   ├── (psychologist)/       # screens do papel "psicólogo"
│   │   ├── (onboarding-patient)/
│   │   ├── (onboarding-psychologist)/
│   │   ├── session/              # tela de videoconferência Daily.co
│   │   └── _layout.tsx           # Sentry → PostHog → Auth → AppData → QueryClient → Stack
│   ├── components/               # UI compartilhada + ai/, activity/
│   ├── contexts/                 # AuthContext (papel + sessão), AppDataContext (dados)
│   ├── hooks/                    # useAuth + hooks/queries/* (TanStack)
│   ├── lib/                      # supabase, sentry, posthog, queryClient, schemas Zod
│   ├── services/                 # camada API: 1 file por domínio (auth, profile, appointment...)
│   ├── supabase/
│   │   ├── functions/            # Edge Functions (Deno): stripe-payment, daily-rooms, ai-agent, etc.
│   │   └── migrations/           # SQL versionado (idempotente — drop policy if exists)
│   └── __tests__/                # Jest: lib/schemas + services/analyticsService + supabase/logger
└── docs/                         # guias, skills, histórico
```

## Stack chave

| Camada | Tech | Onde fica |
|---|---|---|
| UI | React Native + Expo Router | `app/`, `components/` |
| Estado | AppDataContext (legacy) + TanStack Query (adoção incremental) | `contexts/`, `hooks/queries/` |
| Backend | Supabase (Postgres + Auth + Edge Functions Deno) | `supabase/` |
| Vídeo | Daily.co (private rooms + meeting tokens) | `supabase/functions/daily-rooms`, `app/session/[id]` |
| Pagamento | Stripe Connect (10% platform fee) | `supabase/functions/stripe-payment`, `services/financialService` |
| IA | Anthropic Claude (Messages API, prompt caching) | `supabase/functions/ai-agent` |
| Telemetria | Sentry (errors) + PostHog (events, autocapture OFF) | `lib/sentry.ts`, `lib/posthog.ts`, `services/analyticsService.ts` |
| Health | HealthKit (iOS) + Health Connect (Android) | `services/activityService.ts` |
| Validação | Zod schemas em fronteiras (Supabase → app) | `lib/schemas/` |
| Auth | Supabase Auth + invitation code (atomic via `consume_invitation`) | `services/authService`, `services/invitationService` |

## Regras invioláveis (não quebrar)

1. **Segredos**: nunca em código. Apenas via env vars (`EXPO_PUBLIC_*` no client, secrets do Supabase no Edge Function).
2. **`user_id` server-side**: SEMPRE derivar do JWT, NUNCA confiar no body. Verificar em qualquer Edge Function nova.
3. **`payment_status='paid'`**: APENAS o webhook do Stripe pode gravar isso (server-authoritative). O cliente NÃO escreve esse campo. Histórico: deep link `payment-success` foi bypass de pagamento (PR #21).
4. **Migrations**: usar idempotência (`drop ... if exists` antes de `create policy`, `create table if not exists`, `create or replace function`). Verificar 2x contra DB de staging antes de subir.
5. **PostHog autocapture**: DESLIGADO. App de saúde — eventos canônicos via `analyticsService.trackEvent` apenas, com payload curado em `AnalyticsEvents`.
6. **Disclaimer IA**: chat IA SEMPRE mostra "não substitui psicólogo" + 188 (CVV) + 192 (SAMU). Requisito CFP.
7. **Modo teste**: `TEST_MODE=true` ativa mocks quando credencial externa falta. NÃO ligar em produção — failures devem ser explícitas (500). Ver `supabase/functions/_shared/testMode.ts`.

## Onde tocar para fazer X

| Tarefa | Caminho |
|---|---|
| Nova screen do paciente | `app/(patient)/<nome>.tsx` (expo-router auto-rota) |
| Novo serviço/API call | `services/<dominio>Service.ts` + barrel em `services/index.ts` |
| Nova migration | `supabase/migrations/<timestamp>_<nome>.sql` (idempotente) |
| Nova Edge Function | `supabase/functions/<nome>/index.ts` (usar `_shared/cors`, `_shared/logger`, `_shared/testMode`) |
| Novo evento de telemetria | Adicionar em `AnalyticsEvents` const → `services/analyticsService.ts` |
| Novo schema runtime | `lib/schemas/<dominio>.ts` (mirror da interface TS) |
| Novo hook de dados | `hooks/queries/use<X>.ts` (TanStack pattern) |

## Gates antes de commit (não-negociáveis)

```bash
cd projeto
pnpm typecheck    # tsc --noEmit (0 errors)
pnpm test         # jest (39+ tests)
pnpm lint         # 0 errors (warnings OK)
```

CI hard-fails se algum desses errar. Em mudança de migration, aplicar **2x** contra `rygtczfcfhdwpxlgfhvf` via Management API para provar idempotência.

## Pendências conhecidas (follow-up)

Ver `RELEASE.md` § Rollback & idempotência das migrações e as ações externas listadas no fim. Mantida em ordem de prioridade.

## Convenções de PR

- 1 PR = 1 domínio. PRs gigantes são quebrados em sequência (ex: `refactor/a-*`, `refactor/b-*`, `refactor/c-*`).
- Commit message em português, descritiva.
- Trailer obrigatório: `https://claude.ai/code/session_*`
- Draft enquanto WIP. CodeRabbit pula drafts (esperado).

## Para agente Claude novo: leitura recomendada

1. `RELEASE.md` — runbook completo de submit nas lojas + rollback
2. `docs/historico/` — contexto do que mudou e por quê
3. `docs/skills/finalizacao-autonoma/SKILL.md` — metodologia de finalização
4. Este arquivo — overview
5. Auditorias recentes nos PRs #21–22 — estado real vs ideal

Não há atalho mágico. O app é coeso, mas tem ~22 services e ~32 screens — espalhar mudança sem mapear o impacto quebra coisas.
