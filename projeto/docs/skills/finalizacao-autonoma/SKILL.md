---
name: fpe-executor-autonomo
description: "Executa a sequência F-PE (PASSO 01 a 15) de alinhamento e elevação da plataforma SC+Inovação em modo headless autônomo (modo 3) — Claude Code rodando via `claude -p` sem aprovar cada ferramenta. Use SEMPRE que o usuário pedir para 'rodar a sequência sozinho', 'modo autônomo', 'modo 3', 'execução headless', 'rodar os passos sem parar', 'execução automática', 'deixar rodando', orquestrar os passos F-PE, ou automatizar a execução do plano de passos. Embute as travas de segurança que fazem a execução autônoma funcionar de fato nesta sequência: preflight de sandbox, isolamento em branch, classificação de risco por passo, halt obrigatório onde o passo exige decisão humana, e disciplina de ledger. Aciona mesmo se o usuário não disser 'skill' explicitamente."
---

# F-PE · Executor Autônomo (modo 3 / headless)

Orquestra a execução não-interativa da sequência de 15 passos (`docs/passos/passo-NN-*.md`) via `claude -p`, sem prompts de permissão por ferramenta. É o **modo 3** descrito no plano: headless, autônomo, encadeado pelo ledger.

> **Premissa honesta embutida neste skill**: alguns passos desta sequência **não podem** rodar 100% sem humano e funcionar corretamente — não por excesso de zelo, mas por mecânica. O PASSO 01 termina fazendo perguntas de negócio (21 vs 22 microrregiões, numeração de domínios) e o PASSO 02 precisa dessas respostas; migrations territoriais (02), integração externa + PII (08), peso legal LGPD (09) e números públicos (11) são pontos onde adivinhar corrompe dado ou viola lei. Por isso o executor roda autônomo **e para nos pontos certos**. O usuário pode forçar o "full send", mas com flag explícita e ciente do risco.

---

## Quando este skill dispara

Pedidos como: "roda a sequência sozinho", "modo 3", "modo autônomo/headless", "deixa rodando sem parar", "automatiza os passos F-PE", "executa o plano automaticamente".

Se o repositório **não** tiver a sequência F-PE (`docs/passos/ESTADO-EXECUCAO.md` ausente), avise: este skill é específico da sequência F-PE e precisa dos arquivos `passo-NN-*.md` + ledger + protocolo de continuidade no repo.

---

## Fluxo de uso (o que fazer quando este skill dispara)

### 1. Preflight de segurança (obrigatório, sempre)

Rode `scripts/preflight.sh`. Ele verifica e **bloqueia** se algo essencial faltar:
- Está em ambiente isolado? (container/VM/devcontainer — checa indícios). Execução autônoma com `--dangerously-skip-permissions` fora de sandbox é recusada pelo script.
- Está num **branch dedicado** (prefixo `fpe/auto/...`), não em `main`/`master`?
- `git status` limpo (sem trabalho não commitado que se perderia)?
- Credencial presente (`ANTHROPIC_API_KEY` ou auth do CLI)?
- Ledger (`docs/passos/ESTADO-EXECUCAO.md`) e passos presentes?
- `jq` instalado (para parse de custo/saída)?

Se o preflight falhar, **pare e mostre ao usuário o que corrigir.** Não contorne.

### 2. Ler o estado e o mapa de risco

- Leia `docs/passos/ESTADO-EXECUCAO.md` para saber o último passo APROVADO e o próximo da fila.
- Leia `references/mapa-de-risco.md` para a classificação de cada passo (baixo / médio / alto / halt-obrigatório).

### 3. Confirmar o escopo com o usuário (uma vez)

Apresente, de forma curta, e **aguarde escolha**:
- **De qual passo até qual passo** rodar (padrão: do próximo da fila até o fim).
- **Qual modo** (ver tabela abaixo). Padrão: `hibrido`.
- **Orçamento** de custo em USD para abortar (padrão: 20).

| Modo | Flag | Comportamento |
|---|---|---|
| **híbrido** (padrão) | _nenhuma_ | Roda cada passo autônomo (sem babá por ferramenta), mas **para ao fim de cada passo** para você revisar e aprovar no ledger antes do próximo. É o "modo 3" com o portão humano preservado. |
| **full-auto** | `--full-auto` | Auto-aprova no ledger e encadeia os passos de risco **baixo e médio** sem parar. Ainda **para** nos `halt-obrigatório` (01, 02) e nos de risco **alto** (08, 09, 11, 15). |
| **full-auto incluindo críticos** | `--incluir-criticos` | Encadeia tudo, inclusive risco alto. **Para apenas** nos `halt-obrigatório` mecânicos (01, 02), que são impossíveis de pular sem corromper a fundação. Exige confirmação dupla. |

> Recomende o `hibrido` para esta plataforma (governo, dinheiro público, LGPD). Diga isso **uma vez**, sem insistir — a decisão é do usuário.

### 4. Lançar o executor

Rode `scripts/executar-sequencia.sh` com os parâmetros confirmados. Exemplos:

```bash
# híbrido, do próximo passo até o fim, orçamento padrão
bash .claude/skills/fpe-executor-autonomo/scripts/executar-sequencia.sh

# full-auto, do passo 03 ao 07, orçamento 15 USD
bash .claude/skills/fpe-executor-autonomo/scripts/executar-sequencia.sh \
  --de 03 --ate 07 --full-auto --orcamento 15

# encadear tudo, inclusive críticos (confirmação dupla exigida pelo script)
bash .claude/skills/fpe-executor-autonomo/scripts/executar-sequencia.sh --incluir-criticos
```

O script faz, para cada passo:
1. Decide pela `references/mapa-de-risco.md` + modo se **roda** ou **para** (halt).
2. Se roda: `claude -p "$(cat passo-NN-*.md)"` com `--append-system-prompt` apontando para `references/prompt-sistema-autonomo.md`, permission-mode conforme o modo, `--output-format json` para log e custo.
3. Após o passo: confirma no ledger que o status virou 🟡; soma o custo; se passou do orçamento ou o ledger não avançou ou o `claude` saiu com erro → **halt**.
4. No `hibrido`: para e pede sua aprovação. No `full-auto`: o **próprio script** (não o agente) marca ✅ no ledger para passos não-críticos, registrando que foi auto-aprovado, e segue.

### 5. Em caso de halt

O script imprime o motivo e como retomar. Tipicamente:
- **Halt-obrigatório (01/02)**: responda às perguntas/decisões (estão no `docs/passos/ESTADO-EXECUCAO.md` → "Avisos para o próximo passo" e em `BLOQUEIO-*.md` se criado), depois rode de novo a partir do próximo passo.
- **Halt de aprovação (hibrido)**: revise o diff do passo, aprove no ledger (status → ✅), rode de novo.
- **Halt por erro/custo**: investigue o log em `logs/fpe-auto/passo-NN.json`, corrija, rode de novo.

Use `docs/passos/passo-99-retomada.md` se perder o fio.

---

## Princípios que o executor nunca viola

Mesmo no modo mais agressivo, estas regras estão no `prompt-sistema-autonomo.md` e valem sempre:

1. **O agente nunca escreve ✅ APROVADO no ledger.** Só 🟡. A aprovação é do humano (hibrido) ou do script de orquestração que o humano lançou com flag explícita (full-auto). Isso preserva a separação entre "fazer" e "aprovar".
2. **Halt-obrigatório é inviolável.** PASSO 01 (faz perguntas) e PASSO 02 (precisa das respostas + migrations territoriais com FK) sempre param para humano, em qualquer modo.
3. **Bloqueio real → para, não adivinha.** Se o agente bater numa decisão de negócio sem resposta (ex.: destino da 22ª microrregião), ele escreve o bloqueio e para o passo — nunca inventa.
4. **Disciplina de ledger.** Todo passo lê o ledger na abertura e o atualiza no fechamento (+ memória datada + commit). Sem isso, a retomada quebra.
5. **Inegociáveis de engenharia.** Sem segredo em código/log; toda migration com RLS+GRANTs+smoke; ADR antes de decisão estrutural; PT-BR. Se um DoD falhar, reporta e para — não finge verde.
6. **Isolamento.** Só roda em branch dedicado; `--dangerously-skip-permissions` só em sandbox. O preflight recusa o contrário.

---

## Arquivos deste skill

- `scripts/preflight.sh` — checagens de segurança que bloqueiam execução insegura.
- `scripts/executar-sequencia.sh` — o orquestrador headless (loop, risco, halt, custo, ledger).
- `references/mapa-de-risco.md` — classificação dos 15 passos + justificativa. Leia para entender por que cada passo para ou roda.
- `references/prompt-sistema-autonomo.md` — o `--append-system-prompt` injetado em cada `claude -p`: reconcilia os prompts interativos com a execução headless (pula esperas de meio-passo, mas mantém parada de fim-de-passo e a regra de nunca auto-aprovar).

---

## Nota sobre custo (relevante para execução longa)

A partir de 15/06/2026, o uso de `claude -p` / Agent SDK em planos de assinatura consome um crédito mensal de Agent SDK separado do uso interativo. Execução autônoma longa tem orçamento próprio — por isso o flag `--orcamento` aborta o loop ao estourar o teto, e o `--output-format json` registra `total_cost_usd` por passo no log.
