# Fatia P0 — Higiene e Segurança

Aplicado em: 2026-05-26

## O que mudou

### 1. Segurança
- **Removido `.env`** do pacote (continha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` reais).
- **Criado `.env.example`** com placeholders e comentário explicando que segredos (service role, Stripe secret, OpenAI) ficam nas Edge Functions via `supabase secrets set`.
- **`.gitignore` endurecido**: agora ignora `.env` e `.env.*` (mantendo `.env.example`), `*.backup`, `*.bak`, `*.orig`, `.vscode/`, `.idea/`, `*.log`, `android/`, `ios/`.

> ⚠️ **AÇÃO MANUAL OBRIGATÓRIA**: rotacione a chave anônima do Supabase no painel
> (Settings → API → Regenerate anon key) caso o `.env` original já tenha vazado
> em algum lugar (GitHub público, backup, screenshot etc.). A chave anônima
> sozinha não é catastrófica se o RLS estiver configurado, mas rotacionar é
> uma boa prática quando há suspeita de exposição.

### 2. Arquivos de lixo removidos
- 5 arquivos `.backup` em `app/(tabs)/` (a pasta inteira `(tabs)` foi removida — já estava substituída por `(patient)` e `(psychologist)`).
- `.expo/` (cache local, regenerado automaticamente).

### 3. Documentação reorganizada
Antes: **64 arquivos `.md` na raiz** (poluição máxima).

Agora:
- `README.md`, `CHANGELOG.md`, `POLITICA_DE_PRIVACIDADE.md`, `TERMOS_DE_USO.md`, `privacy-policy.md`, `support-page.md` — permanecem na raiz (referenciados externamente).
- `docs/guias/` — guias de configuração permanente (OAuth, Apple Connect, ProGuard, Stripe Connect, integrações, justificativas de permissão Android, etc.).
- `docs/historico/` — TODOS os `CORRECAO_*`, `OTIMIZACAO_*`, `SIMPLIFICACAO_*`, `ANALISE_*`, `DIAGNOSTICO_*`, `IMPLEMENTACAO_*`, `RECREACAO_*`, `REORGANIZACAO_*`, `ATUALIZACAO_*`, `ALINHAMENTO_*`, `AUDITORIA_*`, `AUTENTICACAO_*`, `DEMO_MODE_*`, `PLANO_*`, `PROXIMAS_*`, `PROXIMOS_*`, `RELATORIO_*`, `REMOCAO_*`, `SOLUCAO_*`, `TABBAR_*`. Esses arquivos contam o histórico de iteração, mas não devem estar na raiz.

> Sugestão: revisar `docs/historico/` em outro momento e **apagar** o que já estiver
> obsoleto (boa parte é log de conversas com IA — sem valor a longo prazo).

### 4. `app.json`
- Trocado `"projectId": "sua-project-id-aqui"` por `"REPLACE_WITH_REAL_EAS_PROJECT_ID"`
  (mais óbvio que precisa ser substituído antes de qualquer build EAS).

> ⚠️ **AÇÃO MANUAL**: rodar `eas init` ou colar o `projectId` real do dashboard EAS.

---

## Não aplicado (precisa decisão sua)

### Dependências suspeitas de não-uso
Roda `npx depcheck` no projeto para confirmar antes de remover. Lista provável
(baseada em busca por `import`/`require` no código):

```
@apollo/client            graphql                 immutable
redux                     react-redux             redux-thunk
prop-types                path-to-regexp          dedent
snack-content             es6-error               react-string-replace
querystring               react-native-crypto-js  @graphql-codegen/introspection
@privacyresearch/libsignal-protocol-typescript    react-native-elements
react-native-infinite-scroll-view                 react-native-fade-in-image
react-native-dynamic                              semver
```

**Não removi automaticamente** porque algumas podem ser dependências indiretas
ou estar usadas em código que não auditei (services, edge functions, etc.).
Comando para validar:

```bash
npx depcheck --skip-missing
```

### Skia em versão pré-release
```json
"@shopify/react-native-skia": "v2.0.0-next.4"
```

Pré-release em produção é arriscado. Confirme com a documentação atual qual é
a versão estável mais recente compatível com RN 0.79 / Expo 53 antes de fixar.
Não troquei sem testar.

### Versionamento de migrations Supabase
A pasta `supabase/` só contém `functions/`. **Não há `migrations/` nem
`config.toml`**. Isso significa que o schema do banco (tabelas, RLS policies,
triggers, RPC functions) vive apenas no painel — não está versionado.

**Recomendação forte**: rodar `supabase init` + `supabase db pull` para
trazer o schema para o repo. Sem isso, qualquer recriação do banco é manual e
sujeita a erro.

### RLS (Row Level Security)
Não consigo verificar do código se RLS está habilitado em todas as tabelas.
Faça no SQL Editor do Supabase:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Toda tabela com `rowsecurity = false` é um buraco de segurança aberto.
