#!/usr/bin/env bash
# executar-sequencia.sh — Orquestrador headless (modo 3) da sequência F-PE.
# Roda passos via `claude -p`, encadeando pelo ledger, com travas de risco e custo.
#
# Uso:
#   bash executar-sequencia.sh [--de NN] [--ate NN] [--orcamento USD]
#                              [--full-auto | --incluir-criticos] [--dry-run]
#
# Modos:
#   (padrão)          híbrido: roda cada passo autônomo, PARA ao fim de cada um para aprovação humana.
#   --full-auto       encadeia risco baixo/médio sem parar; PARA em alto (08,09,11,15) e halt-obrigatório (01,02).
#   --incluir-criticos encadeia tudo; PARA só nos halt-obrigatório (01,02). Exige confirmação dupla.
set -uo pipefail

# ----- caminhos -----
RAIZ="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$RAIZ"
DIR_PASSOS="docs/passos"
LEDGER="$DIR_PASSOS/ESTADO-EXECUCAO.md"
DIR_LOGS="logs/fpe-auto"
SKILL_DIR=".claude/skills/fpe-executor-autonomo"
PROMPT_SISTEMA="$SKILL_DIR/references/prompt-sistema-autonomo.md"
mkdir -p "$DIR_LOGS"

# ----- cores -----
VERDE="\033[0;32m"; VERM="\033[0;31m"; AMAR="\033[1;33m"; AZUL="\033[0;34m"; ZERO="\033[0m"
info()  { echo -e "${AZUL}▸${ZERO} $1"; }
ok()    { echo -e "${VERDE}✓${ZERO} $1"; }
warn()  { echo -e "${AMAR}!${ZERO} $1"; }
erro()  { echo -e "${VERM}✗${ZERO} $1"; }

# ----- mapa de risco (ver references/mapa-de-risco.md) -----
declare -A RISCO=(
  [01]=halt_obrigatorio [02]=halt_obrigatorio
  [03]=medio [05]=medio [06]=medio [07]=medio [13]=medio
  [04]=baixo [10]=baixo [12]=baixo [14]=baixo
  [08]=alto [09]=alto [11]=alto [15]=alto
)
ORDEM=(01 02 03 04 05 06 07 08 09 10 11 12 13 14 15)

# ----- parâmetros -----
DE=""; ATE="15"; ORCAMENTO=20; MODO="hibrido"; DRYRUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --de) DE="$2"; shift 2;;
    --ate) ATE="$2"; shift 2;;
    --orcamento) ORCAMENTO="$2"; shift 2;;
    --full-auto) MODO="full_auto"; shift;;
    --incluir-criticos) MODO="incluir_criticos"; shift;;
    --dry-run) DRYRUN=1; shift;;
    *) erro "parâmetro desconhecido: $1"; exit 2;;
  esac
done

# ----- preflight -----
EXIGIR=""
[[ "$MODO" == "incluir_criticos" ]] && EXIGIR="--exigir-sandbox"
if ! bash "$SKILL_DIR/scripts/preflight.sh" $EXIGIR; then
  erro "preflight falhou — abortando."; exit 1
fi

# ----- descobrir passo inicial pelo ledger, se --de não informado -----
proximo_do_ledger() {
  # tenta ler a linha "Próximo passo a executar | PASSO NN"
  grep -iEo 'Próximo passo a executar.*PASSO[[:space:]]*[0-9]{2}' "$LEDGER" 2>/dev/null \
    | grep -oE '[0-9]{2}' | tail -1
}
if [[ -z "$DE" ]]; then
  DE="$(proximo_do_ledger)"; DE="${DE:-01}"
fi
info "Escopo: PASSO $DE → PASSO $ATE | modo: $MODO | orçamento: \$${ORCAMENTO}"

# ----- confirmação dupla para incluir-criticos -----
if [[ "$MODO" == "incluir_criticos" && "$DRYRUN" -eq 0 ]]; then
  warn "Modo INCLUIR-CRÍTICOS: passos de alto risco (migrations territoriais, SEFAZ/PII, LGPD, indicadores públicos) serão"
  warn "encadeados SEM revisão humana entre eles. Isso contraria o desenho de checkpoint da sequência."
  read -r -p "Digite EXATAMENTE 'entendo o risco' para prosseguir: " CONF
  [[ "$CONF" == "entendo o risco" ]] || { erro "confirmação não recebida — abortando."; exit 1; }
fi

# ----- helpers de ledger -----
status_no_ledger() { # $1 = NN  -> imprime o emoji de status da linha do passo
  grep -E "^\|[[:space:]]*$1[[:space:]]*\|" "$LEDGER" 2>/dev/null | head -1
}
ledger_avancou() { # $1 = NN -> 0 se a linha contém 🟡 ou ✅
  status_no_ledger "$1" | grep -qE '🟡|✅'
}
aprovar_no_ledger() { # $1 = NN -> troca 🟡 por ✅ na linha do passo (auto-aprovação do orquestrador)
  local nn="$1"
  sed -i -E "/^\|[[:space:]]*$nn[[:space:]]*\|/ s/🟡/✅/" "$LEDGER"
  # atualiza ponteiro "Último passo APROVADO"
  sed -i -E "s/(Último passo APROVADO\**[^|]*\|[[:space:]]*).*/\1PASSO $nn (auto) |/" "$LEDGER" 2>/dev/null || true
}

# ----- decisão de halt -----
deve_parar_antes() { # $1 = NN -> imprime "halt:<motivo>" ou "roda"
  local nn="$1"; local r="${RISCO[$nn]:-medio}"
  if [[ "$r" == "halt_obrigatorio" ]]; then echo "halt:obrigatorio ($nn exige decisão humana — não pode ser pulado)"; return; fi
  case "$MODO" in
    hibrido)         echo "roda";;  # roda, mas para DEPOIS para aprovação
    full_auto)       [[ "$r" == "alto" ]] && echo "halt:alto ($nn é alto risco; use --incluir-criticos para encadear)" || echo "roda";;
    incluir_criticos) echo "roda";;
  esac
}

# ----- loop principal -----
CUSTO_TOTAL=0
for NN in "${ORDEM[@]}"; do
  (( 10#$NN < 10#$DE )) && continue
  (( 10#$NN > 10#$ATE )) && break

  ARQ=$(ls "$DIR_PASSOS"/passo-"$NN"-*.md 2>/dev/null | head -1)
  if [[ -z "$ARQ" ]]; then erro "arquivo do PASSO $NN não encontrado — abortando."; exit 1; fi

  # já aprovado? pula.
  if status_no_ledger "$NN" | grep -q '✅'; then ok "PASSO $NN já APROVADO no ledger — pulando."; continue; fi

  DECISAO="$(deve_parar_antes "$NN")"
  if [[ "$DECISAO" == halt:* ]]; then
    echo ""; warn "════ HALT antes do PASSO $NN ════"
    warn "Motivo: ${DECISAO#halt:}"
    info "Resolva o necessário e rode novamente:  bash $0 --de $NN${MODO:+ }$( [[ $MODO != hibrido ]] && echo --${MODO//_/-} )"
    info "Consulte: $LEDGER (Avisos para o próximo passo) e logs/."
    exit 0
  fi

  echo ""; info "════ Executando PASSO $NN ($ARQ) ════"
  if [[ "$DRYRUN" -eq 1 ]]; then ok "[dry-run] rodaria claude -p para o PASSO $NN"; continue; fi

  # permission-mode conforme o modo
  if [[ "$MODO" == "hibrido" ]]; then PERM=(--permission-mode acceptEdits); else PERM=(--dangerously-skip-permissions); fi

  LOG="$DIR_LOGS/passo-$NN.json"
  set +e
  claude -p "$(cat "$ARQ")" \
    "${PERM[@]}" \
    --append-system-prompt-file "$PROMPT_SISTEMA" \
    --output-format json \
    > "$LOG" 2> "$DIR_LOGS/passo-$NN.err"
  RC=$?
  set -e 2>/dev/null || true

  if [[ $RC -ne 0 ]]; then
    erro "claude -p saiu com código $RC no PASSO $NN. Veja $DIR_LOGS/passo-$NN.err"; exit 1
  fi

  # custo acumulado
  CUSTO=$(jq -r '.total_cost_usd // 0' "$LOG" 2>/dev/null || echo 0)
  CUSTO_TOTAL=$(awk -v a="$CUSTO_TOTAL" -v b="$CUSTO" 'BEGIN{printf "%.4f", a+b}')
  info "Custo do passo: \$$CUSTO | acumulado: \$$CUSTO_TOTAL (teto \$$ORCAMENTO)"

  # ledger avançou? (passo escreveu 🟡)
  if ! ledger_avancou "$NN"; then
    erro "PASSO $NN terminou mas o ledger não registrou conclusão (🟡). Possível bloqueio — veja $LOG e o ledger."; exit 1
  fi
  ok "PASSO $NN concluído (🟡 no ledger)."

  # estourou orçamento?
  if awk -v t="$CUSTO_TOTAL" -v o="$ORCAMENTO" 'BEGIN{exit !(t>o)}'; then
    warn "Orçamento de \$$ORCAMENTO estourado (acumulado \$$CUSTO_TOTAL). Parando após o PASSO $NN."; exit 0
  fi

  # aprovação
  if [[ "$MODO" == "hibrido" ]]; then
    echo ""; warn "════ HALT para aprovação do PASSO $NN (modo híbrido) ════"
    info "Revise o diff:  git log -1 --stat   |   git diff HEAD~1"
    info "Se OK, aprove no ledger (status do PASSO $NN → ✅) e rode:  bash $0 --de $(printf '%02d' $((10#$NN+1)))"
    exit 0
  else
    aprovar_no_ledger "$NN"
    ok "PASSO $NN auto-aprovado no ledger pelo orquestrador (modo $MODO)."
  fi
done

echo ""
ok "Sequência concluída no escopo PASSO $DE → $ATE. Custo total: \$$CUSTO_TOTAL."
info "Confira o ledger e rode docs/passos/passo-99-retomada.md para um balanço."
