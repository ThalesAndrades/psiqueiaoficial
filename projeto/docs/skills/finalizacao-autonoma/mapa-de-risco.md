# Mapa de Risco dos Passos F-PE

Classificação que o orquestrador usa para decidir, em cada modo, se um passo **roda autônomo** ou **para para humano**. A justificativa importa: não é zelo genérico, é onde adivinhar custa caro ou onde a mecânica da sequência exige um humano.

## Tabela de classificação

| Passo | Título | Risco | Por quê |
|---|---|---|---|
| 01 | Diagnóstico | 🛑 halt-obrigatório | Termina **fazendo perguntas de negócio** (21 vs 22 microrregiões, numeração de domínios novos). Não há como prosseguir certo sem as respostas — um agente ou inventa (corrompe a fundação) ou trava. |
| 02 | Divergências fundacionais | 🛑 halt-obrigatório | Depende das respostas do 01. Faz **migrations territoriais** que mergeiam/removem dado com FK — irreversível na prática. O próprio passo manda parar se uma FK aponta para a 22ª microrregião sem orientação. |
| 03 | Modelo do programa | 🟠 médio | Modelagem de dados, mas **aditiva** (cria eixo/ação/meta). Baixo risco de destruir dado; ainda assim mexe na espinha dorsal — bom revisar. |
| 04 | DevSecOps | 🟢 baixo | CI, hooks, linters. Não toca dado nem decisão de negócio. Seguro para autônomo. |
| 05 | Observabilidade | 🟠 médio | Cria schema `auditoria` (base de LGPD e veracidade). Instrumentação é segura, mas o schema é fundacional. |
| 06 | Janelas temporais | 🟠 médio | Invariantes de banco (EXCLUDE GIST, triggers, cron). Crítico para veracidade, mas bem especificado e testável. |
| 07 | Veracidade geo+QR | 🟠 médio | Segurança/anti-fraude, bem especificado. Mexe em PostGIS e captura, mas com smoke cobrindo os vetores. |
| 08 | Veracidade foto+SEFAZ | 🔴 alto | **Integração externa** (SEFAZ) + **PII de localização** (foto/EXIF) + decisão de provedor com contrato. Erro aqui tem custo financeiro e legal. |
| 09 | LGPD operacional | 🔴 alto | **Peso legal.** DSR, retention (eliminação de dado!), base legal por coluna. Adivinhar aqui é risco regulatório direto (ANPD). |
| 10 | Testing pyramid | 🟢 baixo | Escreve testes. Não muda comportamento de produção. Seguro para autônomo. |
| 11 | Indicadores+domínios | 🔴 alto | Cria D20 (PII de **alunos/menores**), D19, D17, e os **números públicos** do programa. Erro vira número errado em portal de transparência e prestação de contas. |
| 12 | Performance | 🟢 baixo | CDN/cache/queue/budgets. Otimização medida antes/depois; não destrói dado. |
| 13 | Event-driven | 🟠 médio | Arquitetura distribuída (outbox, sagas). Risco de consistência, mas idempotente e testável. |
| 14 | Acessibilidade | 🟢 baixo | Frontend/a11y. Não toca dado nem regra de negócio. |
| 15 | Identity gov.br | 🔴 alto | **Federação externa** (gov.br), WebAuthn, JIT, dados abertos. Segurança de identidade e exposição pública. |

## Como cada modo trata cada risco

| Risco | híbrido | full-auto | incluir-críticos |
|---|---|---|---|
| 🛑 halt-obrigatório (01, 02) | **para** | **para** | **para** |
| 🔴 alto (08, 09, 11, 15) | roda + para p/ aprovar | **para** | roda + auto-aprova |
| 🟠 médio (03, 05, 06, 07, 13) | roda + para p/ aprovar | roda + auto-aprova | roda + auto-aprova |
| 🟢 baixo (04, 10, 12, 14) | roda + para p/ aprovar | roda + auto-aprova | roda + auto-aprova |

> No **híbrido**, todo passo para ao fim para aprovação humana — é o "modo 3" com o portão preservado. No **full-auto**, baixo/médio encadeiam sozinhos. No **incluir-críticos**, só os dois halt-obrigatório resistem (porque são mecanicamente impossíveis de pular sem corromper a fundação).

## Recomendação por contexto

- **Plataforma de governo (este caso)**: `hibrido`. O custo de um erro autônomo em dado de cidadão, dinheiro público ou LGPD supera de longe o ganho de velocidade.
- **Se quiser acelerar com segurança**: `full-auto` rodando só os passos baixo/médio em lote (ex.: `--de 04 --ate 04`, depois `--de 10 --ate 10`), mantendo humano nos altos e nos fundacionais.
- **`incluir-criticos`**: reserve para um ambiente de teste/staging descartável onde você quer ver a sequência inteira rodar de ponta a ponta para validar o encadeamento — nunca contra o banco de produção.
