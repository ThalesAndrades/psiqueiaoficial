# 🧪 Script de Teste de Todos os Fluxos

**Objetivo:** Validar todas as funcionalidades do app antes do envio para review.

---

## 📱 Preparação

### Dispositivos/Simuladores Necessários
- [ ] iPhone 15 Pro (iOS 17+) ou simulador
- [ ] iPad (opcional, mas recomendado)
- [ ] Web browser (Chrome/Safari)

### Credenciais de Teste
```
PACIENTE:
Email: revisor.paciente@psiqueia.com
Senha: Revisor@Paciente2025

PSICÓLOGO:
Email: revisor.psicologo@psiqueia.com
Senha: Revisor@Psicologo2025

STRIPE TESTE:
Cartão: 4242 4242 4242 4242
Data: 12/30
CVV: 123
```

---

## 🔐 Teste 1: Autenticação

### Login
- [ ] Abrir app
- [ ] Inserir credenciais de paciente
- [ ] Clicar "Entrar"
- [ ] **Verificar:** Redirecionado para dashboard paciente em < 3s
- [ ] Fazer logout
- [ ] **Verificar:** Volta para tela de login

### Cadastro
- [ ] Clicar "Criar conta"
- [ ] Preencher: nome, email, senha
- [ ] Selecionar "Paciente"
- [ ] Clicar "Criar conta"
- [ ] **Verificar:** Redirecionado para onboarding
- [ ] **Verificar:** Perfil criado no banco de dados

### Recuperação de Senha
- [ ] Clicar "Esqueci minha senha"
- [ ] Inserir email válido
- [ ] Clicar "Enviar"
- [ ] **Verificar:** Toast de confirmação
- [ ] Checar email recebido
- [ ] Clicar no link de reset
- [ ] **Verificar:** Redirecionado para app
- [ ] Definir nova senha
- [ ] **Verificar:** Login funciona com nova senha

---

## 👤 Teste 2: Fluxo do Paciente

### Onboarding
- [ ] Fazer login como novo paciente
- [ ] **Verificar:** Tela de onboarding aparece
- [ ] Preencher dados: telefone, data nascimento
- [ ] Clicar "Continuar"
- [ ] **Verificar:** Redirecionado para dashboard

### Dashboard
- [ ] **Verificar:** Nome do paciente exibido
- [ ] **Verificar:** Psicólogo vinculado aparece (se houver)
- [ ] **Verificar:** Próxima sessão exibida (se houver)
- [ ] **Verificar:** Cards de funcionalidades (Diário, Plano, Chat IA)
- [ ] Tocar em cada card
- [ ] **Verificar:** Navega para tela correta

### Agendamento de Sessão
- [ ] Ir para "Nova Sessão"
- [ ] **Verificar:** Psicólogo vinculado aparece
- [ ] **Verificar:** Preço da sessão exibido
- [ ] Tocar no calendário
- [ ] **Verificar:** Modal de calendário abre
- [ ] Selecionar data futura (ex: amanhã)
- [ ] **Verificar:** Data atualizada
- [ ] Selecionar horário (ex: 10:00)
- [ ] **Verificar:** Horário destacado
- [ ] Adicionar observações (opcional)
- [ ] Clicar "Continuar para Pagamento"
- [ ] **Verificar:** Redirecionado para tela de pagamento

### Pagamento Stripe
- [ ] **Verificar:** Valor correto exibido
- [ ] **Verificar:** Nome do psicólogo exibido
- [ ] Clicar "Pagar com Cartão"
- [ ] **Verificar:** Redirecionado para Stripe Checkout
- [ ] Preencher dados do cartão teste:
  - Número: 4242 4242 4242 4242
  - Data: 12/30
  - CVV: 123
  - Nome: Test User
- [ ] Clicar "Pay"
- [ ] **Verificar:** Retorna ao app
- [ ] **Verificar:** Mensagem de sucesso
- [ ] **Verificar:** Redirecionado para agenda

### Agenda
- [ ] Ir para aba "Agenda"
- [ ] **Verificar:** Sessão agendada aparece
- [ ] **Verificar:** Data e horário corretos
- [ ] **Verificar:** Status "Confirmado"
- [ ] **Verificar:** Link do Google Meet presente
- [ ] Tocar no link
- [ ] **Verificar:** Abre Google Meet

### Diário Emocional
- [ ] Ir para "Diário"
- [ ] Clicar no botão "+"
- [ ] Selecionar humor (ex: Feliz)
- [ ] Escrever entrada de texto
- [ ] Adicionar fatores (ex: Trabalho, Exercício)
- [ ] Marcar "Compartilhar com psicólogo"
- [ ] Clicar "Salvar"
- [ ] **Verificar:** Entrada salva
- [ ] **Verificar:** Insights de IA aparecem (~5-10s)
- [ ] **Verificar:** Entrada na lista

### Edição de Perfil
- [ ] Ir para aba "Perfil"
- [ ] Clicar "Editar Perfil"
- [ ] Alterar nome
- [ ] Alterar telefone
- [ ] Adicionar data de nascimento
- [ ] Adicionar contato de emergência
- [ ] Clicar "Salvar"
- [ ] **Verificar:** Toast de sucesso
- [ ] Voltar para perfil
- [ ] **Verificar:** Dados atualizados

### Exclusão de Conta
- [ ] Ir para "Perfil"
- [ ] Rolar até o final
- [ ] Clicar "Excluir Conta"
- [ ] **Verificar:** Modal de confirmação
- [ ] Clicar "Cancelar"
- [ ] **Verificar:** Modal fecha
- [ ] Clicar "Excluir Conta" novamente
- [ ] Confirmar exclusão
- [ ] **Verificar:** Redirecionado para login
- [ ] **Verificar:** Não é possível fazer login com conta excluída

---

## 👨‍⚕️ Teste 3: Fluxo do Psicólogo

### Onboarding
- [ ] Fazer login como novo psicólogo
- [ ] **Verificar:** Tela de onboarding aparece
- [ ] Preencher dados:
  - Nome completo
  - Telefone
  - CRP
  - Especialidades (ex: TCC, Ansiedade)
  - Bio
  - Preço da sessão (ex: 150.00)
  - Abordagem
- [ ] Clicar "Continuar"
- [ ] **Verificar:** Redirecionado para dashboard

### Dashboard
- [ ] **Verificar:** Nome do psicólogo exibido
- [ ] **Verificar:** CRP exibido
- [ ] **Verificar:** Estatísticas (pacientes, sessões, receita)
- [ ] **Verificar:** Próximas sessões listadas
- [ ] **Verificar:** Alertas (se Stripe não configurado)

### Configurar Stripe Connect
- [ ] Ir para "Perfil"
- [ ] **Verificar:** Status "Não configurado" ou "Pendente"
- [ ] Clicar "Configurar Stripe Connect"
- [ ] **Verificar:** Redirecionado para Stripe Onboarding
- [ ] Preencher dados do onboarding (modo teste):
  - País: Brasil
  - Tipo: Individual
  - Dados pessoais
  - Dados bancários (usar dados de teste)
- [ ] Completar onboarding
- [ ] **Verificar:** Retorna ao app
- [ ] **Verificar:** Status atualizado para "Ativo"
- [ ] Clicar "Acessar Dashboard Stripe"
- [ ] **Verificar:** Abre Stripe Dashboard

### Gestão de Disponibilidade
- [ ] Ir para "Perfil"
- [ ] Clicar "Editar Disponibilidade"
- [ ] Habilitar dias (ex: Seg, Ter, Qua)
- [ ] Definir horários:
  - Início: 09:00
  - Fim: 18:00
- [ ] Clicar "Copiar para todos os dias"
- [ ] **Verificar:** Todos os dias atualizados
- [ ] Clicar "Salvar"
- [ ] **Verificar:** Toast de sucesso
- [ ] Voltar para perfil
- [ ] **Verificar:** Disponibilidade salva

### Edição de Perfil Profissional
- [ ] Ir para "Perfil"
- [ ] Clicar "Editar Dados Profissionais"
- [ ] Alterar:
  - CRP
  - Bio
  - Especialidades
  - Preço
  - Abordagem
- [ ] Clicar "Salvar"
- [ ] **Verificar:** Toast de sucesso
- [ ] **Verificar:** Dados atualizados no perfil

### Agenda e Sessões
- [ ] Ir para aba "Agenda"
- [ ] **Verificar:** Sessões agendadas por pacientes aparecem
- [ ] **Verificar:** Data, horário, paciente corretos
- [ ] **Verificar:** Status do pagamento
- [ ] Tocar em uma sessão
- [ ] **Verificar:** Detalhes completos
- [ ] **Verificar:** Link do Google Meet
- [ ] Tocar no link
- [ ] **Verificar:** Abre Google Meet

### Gestão de Pacientes
- [ ] Ir para aba "Pacientes"
- [ ] **Verificar:** Lista de pacientes vinculados
- [ ] Tocar em um paciente
- [ ] **Verificar:** Detalhes do paciente
- [ ] **Verificar:** Histórico de sessões
- [ ] **Verificar:** Diário compartilhado (se houver)
- [ ] **Verificar:** Plano de tratamento (se houver)

### Financeiro
- [ ] Ir para aba "Financeiro"
- [ ] **Verificar:** Resumo de receita
- [ ] **Verificar:** Transações listadas
- [ ] **Verificar:** Status de cada transação
- [ ] **Verificar:** Botão "Acessar Stripe Dashboard"
- [ ] Clicar no botão
- [ ] **Verificar:** Abre Stripe Dashboard

---

## 🤖 Teste 4: Funcionalidades de IA

### Chat IA (Paciente)
- [ ] Fazer login como paciente
- [ ] Ir para "Chat IA"
- [ ] Escrever mensagem: "Estou me sentindo ansioso"
- [ ] Enviar
- [ ] **Verificar:** IA responde em ~3-5s
- [ ] **Verificar:** Resposta relevante
- [ ] Fazer mais perguntas
- [ ] **Verificar:** Conversa mantém contexto

### Insights do Diário
- [ ] Criar entrada no diário
- [ ] Aguardar ~5-10s
- [ ] **Verificar:** Card de insights aparece
- [ ] Tocar no card
- [ ] **Verificar:** Insights detalhados
- [ ] **Verificar:** Sugestões de temas para terapia
- [ ] **Verificar:** Padrões identificados

---

## 🔔 Teste 5: Notificações e Deep Links

### Deep Link: Recuperação de Senha
- [ ] Solicitar reset de senha
- [ ] Abrir email
- [ ] Clicar no link
- [ ] **Verificar:** App abre na tela de reset
- [ ] Definir nova senha
- [ ] **Verificar:** Login funciona

### Deep Link: Retorno de Pagamento
- [ ] Agendar sessão
- [ ] Pagar no Stripe
- [ ] **Verificar:** Retorna ao app automaticamente
- [ ] **Verificar:** Mensagem de sucesso
- [ ] **Verificar:** Redirecionado para agenda

### Notificações Push (se configurado)
- [ ] Permitir notificações no iOS
- [ ] Agendar sessão para daqui a 1h
- [ ] **Verificar:** Notificação recebida 15min antes
- [ ] Tocar na notificação
- [ ] **Verificar:** App abre na sessão

---

## ⚡ Teste 6: Performance e Estabilidade

### Carregamento Inicial
- [ ] Fechar app completamente
- [ ] Abrir app
- [ ] Cronometrar tempo de carregamento
- [ ] **Verificar:** App carrega em < 3s
- [ ] **Verificar:** Sem telas brancas/erros

### Navegação
- [ ] Navegar entre todas as abas
- [ ] **Verificar:** Transições suaves (60fps)
- [ ] **Verificar:** Sem travamentos
- [ ] Voltar para tela anterior várias vezes
- [ ] **Verificar:** Não crasha

### Listas Longas
- [ ] Criar 20+ entradas de diário
- [ ] Rolar lista rapidamente
- [ ] **Verificar:** Scroll suave
- [ ] **Verificar:** Imagens/avatars carregam

### Uso Contínuo
- [ ] Usar app por 10 minutos sem fechar
- [ ] Alternar entre telas
- [ ] Executar várias ações
- [ ] **Verificar:** Sem memory leaks
- [ ] **Verificar:** Sem crashes
- [ ] **Verificar:** App não fica lento

### Offline
- [ ] Desabilitar Wi-Fi e dados móveis
- [ ] Tentar fazer login
- [ ] **Verificar:** Mensagem de erro clara
- [ ] **Verificar:** App não crasha
- [ ] Reabilitar conexão
- [ ] **Verificar:** App retoma funcionamento

---

## 🔒 Teste 7: Segurança

### Proteção de Dados
- [ ] Tentar acessar dados de outro usuário via URL
- [ ] **Verificar:** Acesso negado
- [ ] Tentar modificar dados via devtools
- [ ] **Verificar:** RLS bloqueia

### Sessões
- [ ] Fazer login
- [ ] Esperar 24h sem usar
- [ ] **Verificar:** Token ainda válido OU solicita novo login
- [ ] Fazer logout
- [ ] Tentar acessar rota protegida via URL
- [ ] **Verificar:** Redirecionado para login

### Pagamentos
- [ ] Inspecionar requests de pagamento
- [ ] **Verificar:** Chaves Stripe não expostas no client
- [ ] **Verificar:** Apenas tokens públicos visíveis
- [ ] Tentar pagar sessão de outro usuário
- [ ] **Verificar:** Bloqueado pelo Edge Function

---

## 📊 Resultados

### Resumo de Testes

| Categoria | Total | Passou | Falhou |
|-----------|-------|--------|--------|
| Autenticação | _ | _ | _ |
| Fluxo Paciente | _ | _ | _ |
| Fluxo Psicólogo | _ | _ | _ |
| IA | _ | _ | _ |
| Notificações | _ | _ | _ |
| Performance | _ | _ | _ |
| Segurança | _ | _ | _ |
| **TOTAL** | **_** | **_** | **_** |

### Bugs Encontrados

| # | Severidade | Descrição | Tela/Fluxo | Status |
|---|------------|-----------|------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severidade:**
- 🔴 **Crítico:** Bloqueia envio
- 🟠 **Alto:** Deve ser corrigido antes do lançamento
- 🟡 **Médio:** Pode ser corrigido após lançamento
- 🟢 **Baixo:** Cosmético, não urgente

---

## ✅ Critérios de Aprovação

### Para Enviar para Review:
- [ ] **Zero bugs críticos** (🔴)
- [ ] **Máximo 2 bugs altos** (🟠) não bloqueantes
- [ ] **100% dos fluxos principais funcionando**
- [ ] **Sem crashes em 10 minutos de uso**
- [ ] **Todos os pagamentos Stripe funcionando**
- [ ] **Deep links funcionando**
- [ ] **Performance aceitável** (carregamento < 3s)

---

**Data do Teste:** _____________  
**Testador:** _____________  
**Dispositivo:** _____________  
**Versão do App:** 1.0.0  
**Build Number:** _____________

**Resultado Final:** ☐ APROVADO ☐ REPROVADO

**Observações:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
