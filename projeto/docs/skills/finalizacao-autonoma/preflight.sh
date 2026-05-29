#!/usr/bin/env bash
# preflight.sh — Checagens de segurança ANTES de qualquer execução autônoma.
# Bloqueia (exit != 0) se o ambiente não for seguro para rodar headless.
# Uso: bash preflight.sh [--exigir-sandbox]
set -uo pipefail

VERDE="\033[0;32m"; VERM="\033[0;31m"; AMAR="\033[1;33m"; ZERO="\033[0m"
ok()    { echo -e "${VERDE}✓${ZERO} $1"; }
falha() { echo -e "${VERM}✗${ZERO} $1"; ERROS=$((ERROS+1)); }
aviso() { echo -e "${AMAR}!${ZERO} $1"; }

ERROS=0
EXIGIR_SANDBOX=0
[[ "${1:-}" == "--exigir-sandbox" ]] && EXIGIR_SANDBOX=1

echo "== Preflight do Executor Autônomo F-PE =="

# 1. Repositório git
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ok "dentro de um repositório git"
else
  falha "não está em um repositório git"
fi

# 2. Branch dedicado (não main/master)
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
case "$BRANCH" in
  main|master|develop|production)
    falha "branch atual é '$BRANCH' — crie um branch dedicado: git switch -c fpe/auto/$(date +%Y%m%d)" ;;
  fpe/auto/*)
    ok "branch dedicado: $BRANCH" ;;
  *)
    aviso "branch '$BRANCH' não segue o prefixo recomendado fpe/auto/ — prossiga só se for intencional" ;;
esac

# 3. Árvore limpa (sem trabalho não commitado que se perderia)
if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then
  ok "árvore de trabalho limpa"
else
  falha "há mudanças não commitadas — commite ou faça stash antes (a execução autônoma vai gerar muitos diffs)"
fi

# 4. Credencial de API / auth
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  ok "ANTHROPIC_API_KEY presente no ambiente"
elif claude --version >/dev/null 2>&1; then
  aviso "ANTHROPIC_API_KEY ausente; assumindo auth do CLI (OAuth/keychain). Em --bare isso não funciona."
else
  falha "sem ANTHROPIC_API_KEY e sem CLI 'claude' acessível"
fi

# 5. CLI claude instalado
if claude --version >/dev/null 2>&1; then
  ok "CLI claude: $(claude --version 2>/dev/null | head -1)"
else
  falha "CLI 'claude' não encontrado (npm install -g @anthropic-ai/claude-code)"
fi

# 6. jq (parse de custo/saída json)
if command -v jq >/dev/null 2>&1; then ok "jq instalado"; else falha "jq não instalado (necessário para custo/saída)"; fi

# 7. Artefatos da sequência F-PE
[[ -f docs/passos/ESTADO-EXECUCAO.md ]] && ok "ledger encontrado" || falha "docs/passos/ESTADO-EXECUCAO.md ausente"
N_PASSOS=$(ls docs/passos/passo-[0-9][0-9]-*.md 2>/dev/null | wc -l | tr -d ' ')
[[ "$N_PASSOS" -ge 1 ]] && ok "$N_PASSOS arquivos de passo encontrados" || falha "nenhum docs/passos/passo-NN-*.md encontrado"
[[ -f .claude/skills/fpe-executor-autonomo/references/prompt-sistema-autonomo.md ]] \
  && ok "prompt de sistema autônomo encontrado" \
  || aviso "prompt-sistema-autonomo.md não encontrado no caminho padrão do skill"

# 8. Indícios de sandbox/isolamento
SANDBOX=0
if [[ -f /.dockerenv ]] || grep -qaE '(docker|containerd|kubepods)' /proc/1/cgroup 2>/dev/null; then
  SANDBOX=1; ok "indício de container detectado"
elif [[ -n "${REMOTE_CONTAINERS:-}${CODESPACES:-}${DEVCONTAINER:-}" ]]; then
  SANDBOX=1; ok "indício de devcontainer/codespaces detectado"
else
  aviso "nenhum indício de container/sandbox — execução com --dangerously-skip-permissions é arriscada aqui"
fi
if [[ "$EXIGIR_SANDBOX" -eq 1 && "$SANDBOX" -eq 0 ]]; then
  falha "modo crítico exige sandbox e nenhum foi detectado"
fi

echo "== Fim do preflight =="
if [[ "$ERROS" -gt 0 ]]; then
  echo -e "${VERM}Preflight FALHOU com $ERROS erro(s). Corrija antes de executar.${ZERO}"
  exit 1
fi
echo -e "${VERDE}Preflight OK.${ZERO}"
exit 0
