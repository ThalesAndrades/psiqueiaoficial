# Guia de submissão — Apple App Store (PsiquèIA)

Passos exatos para gerar o primeiro build e submeter ao App Store Connect. Pré-requisitos já cumpridos (✅) e pendentes (⏳) listados abaixo.

Este guia complementa `RELEASE.md` com os passos específicos da PRIMEIRA submissão; reuso após o primeiro build será só `eas build` + `eas submit`.

## Pré-requisitos

| Item | Status | Notas |
|---|---|---|
| Conta de developer Apple ativa ($99/ano) | ✅ | Team ID `2QJ24JV9N2` |
| App skeleton criado no App Store Connect | ✅ | ASC App ID numérico já disponível |
| Bundle ID definido no App Store Connect | ✅ | `app.meupsiqueia` |
| `app.json` sincronizado com o Bundle ID acima | ✅ | corrigido neste PR |
| App Store Connect API Key (`.p8`) gerada | ✅ | Key ID `JN5XHULW4G`, Issuer ID em mãos |
| Política de privacidade hospedada em URL pública | ⏳ | usar `POLITICA_DE_PRIVACIDADE.md` em `psiqueia.com/privacidade` |
| Conta EAS (`expo.dev`) + EAS CLI instalado | ⏳ | `npm i -g eas-cli && eas login` |
| `eas init` rodado para popular `extra.eas.projectId` | ⏳ | substitui o `00000000-...` |
| EAS secrets configurados (próximo passo deste guia) | ⏳ | — |
| Screenshots geradas (5 tamanhos obrigatórios) | ⏳ | — |
| Privacy nutrition label preenchida no App Store Connect | ⏳ | — |

## Passo 0 — Proteja o `.p8`

A chave que você baixou (`AuthKey_JN5XHULW4G.p8`) é uma credencial de submissão. Trate como senha: nunca commite, nunca envie em chat, nunca cole em log.

Mova para um local seguro fora do repo (ex: `~/secure/AuthKey_JN5XHULW4G.p8`). Em CI futuro, é uploaded via `eas credentials` e gerenciado pela EAS.

## Passo 1 — Setup EAS (uma vez por máquina)

No seu Mac, dentro de `projeto/`:

```bash
npm install -g eas-cli
eas login           # email + senha Expo (não Apple)
eas init            # cria projeto no expo.dev e popula extra.eas.projectId no app.json
```

> Importante: `eas init` modifica `app.json`. Commit dessa mudança (o `projectId` real substitui o placeholder).

## Passo 2 — Configurar EAS secrets (uma vez por projeto)

EAS Build e EAS Submit leem credenciais via env vars referenciadas em `eas.json`. Os nomes já estão definidos lá (`$APPLE_ID`, `$ASC_APP_ID`, `$APPLE_TEAM_ID`). Crie os secrets correspondentes:

```bash
# Apple ID (email de login da sua conta Apple Developer)
eas secret:create --scope project --name APPLE_ID --value 'seu-email-apple@dominio.com'

# ASC App ID — numérico, gerado quando você criou o app no App Store Connect
eas secret:create --scope project --name ASC_APP_ID --value '<o número que aparece em Informações Gerais > ID Apple>'

# Team ID — exibido em Membership no portal de developer
eas secret:create --scope project --name APPLE_TEAM_ID --value '2QJ24JV9N2'
```

Os valores ficam criptografados no EAS — não aparecem em log nem no GitHub.

## Passo 3 — Upload da `.p8` no EAS (uma vez)

```bash
eas credentials
```

Menu interativo. Escolha:
1. `ios`
2. `production`
3. `App Store Connect API Key: Manage your API Key`
4. `Set up a new API Key`
5. Passe o caminho local do `.p8`, Issuer ID e Key ID quando perguntado

Ao final, EAS armazena a key encriptada e usa automaticamente em `eas submit`. Você pode deletar a `.p8` local depois disso.

## Passo 4 — Credenciais runtime do app (env vars `EXPO_PUBLIC_*`)

O bundle do app precisa das chaves de Supabase e (opcional) Sentry/PostHog no momento do build. Esses são DIFERENTES dos secrets de submissão acima.

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value 'https://rygtczfcfhdwpxlgfhvf.supabase.co'
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value '<anon key do dashboard Supabase>'

# Opcionais — pula se ainda não tiver as keys
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value '<dsn>'
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value '<key>'
```

A `anon key` está em https://supabase.com/dashboard/project/rygtczfcfhdwpxlgfhvf/settings/api → `Project API keys` → `anon public`.

## Passo 5 — Pre-flight no Mac

```bash
cd projeto
pnpm install --frozen-lockfile
pnpm typecheck    # 0 errors
pnpm test         # 56/56 passando
pnpm lint         # 0 errors
```

Se algum falhar, **não submeta** — a CI também bloqueia.

## Passo 6 — Build de produção iOS

```bash
eas build --platform ios --profile production
```

- EAS abre um worker macOS na nuvem (sem precisar de Mac local pro build em si, mas o `eas` CLI precisa estar no seu Mac para autenticar e enviar o source).
- Tempo: ~15-25 min (cold build); ~5 min (warm).
- O CLI imprime a URL do build no expo.dev. Acompanhe lá.
- `autoIncrement: true` no `eas.json` faz o EAS incrementar `buildNumber` automaticamente — não precisa editar `app.json` manualmente.

## Passo 7 — Submit para o App Store Connect

```bash
eas submit --platform ios --profile production
```

Isso pega o último build de produção e faz upload para o App Store Connect. Tempo de processamento da Apple: 10-30 min depois do upload. O build aparece em:

- TestFlight → Builds (para teste interno antes do release público)
- App Store → Versions (para submissão à revisão Apple)

## Passo 8 — Metadados no App Store Connect (web UI)

Antes de pedir review, preencha em https://appstoreconnect.apple.com:

| Seção | Conteúdo |
|---|---|
| Informações do app → Subtítulo | "IA aplicada à prática clínica" ✅ |
| Informações do app → Categoria | Saúde e fitness |
| Privacidade | URL pública da Política de Privacidade |
| Privacidade → Nutrition Label | Declarar dados coletados (account, health, diagnostics) |
| Versão → Descrição | Extraída do README ou nova redação |
| Versão → Palavras-chave | terapia, psicologia, telessaúde, ansiedade, depressão, autocuidado |
| Versão → Screenshots | 5 tamanhos: 6.5" (1290x2796), 5.5" (1242x2208), iPad 12.9" + 11" |
| Versão → URL de suporte | https://psiqueia.com/suporte |
| Versão → URL de marketing | https://psiqueia.com |
| Classificação etária | 12+ (uso terapêutico, sem conteúdo adulto) |
| Encriptação | Já declarado `ITSAppUsesNonExemptEncryption: false` no `app.json` |

Quando tudo preenchido + build selecionado → **Submit for Review**. Tempo médio de review Apple: 24-48h.

## Passo 9 — TestFlight antes do release (recomendado)

Não pule. TestFlight detecta problemas que o build local não detecta:

1. App Store Connect → TestFlight → Add Internal Testers (até 100, sem aprovação Apple)
2. Adicione seu email + de 2-3 colegas
3. Instalar TestFlight no iPhone, aceitar convite, baixar o build
4. Smoke test do fluxo completo: signup → onboarding → agendar sessão → diário → IA chat → log out

Se tudo OK, aí sim submeta à App Store para review.

## Comandos resumidos (após setup inicial)

A partir da segunda release, é só:

```bash
cd projeto
git pull
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

O `autoIncrement` cuida do build number; você só edita `expo.version` no `app.json` quando quiser bump semântico (1.0.0 → 1.1.0).

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| `Bundle Identifier mismatch` no upload | `app.json` não bate com o Bundle ID do App Store Connect — `app.meupsiqueia` em ambos |
| `eas submit` pede credenciais a cada submit | API Key não foi salva via `eas credentials` |
| TestFlight diz "Missing Compliance" | Confirme em Versions → Export Compliance que app não usa encriptação não-isenta |
| Build da EAS falha em "Pod install" | Algum native module precisa de config plugin adicional — checar `app.json` plugins |

## Pendências não cobertas neste guia

- Hospedar `apple-app-site-association` em `https://psiqueia.com/.well-known/apple-app-site-association` (necessário para Universal Links — `associatedDomains: ['applinks:psiqueia.com']` já está no `app.json`).
- Designar o primeiro admin do sistema de moderação (PR #25) via SQL no DB de produção.
- Configurar secrets reais de Stripe e Anthropic (modo TEST_MODE cobre demo).
