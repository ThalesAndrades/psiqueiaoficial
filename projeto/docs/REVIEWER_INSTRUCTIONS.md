# Instruções para Revisão – PsiquèIA

**Assunto:** Informações para Revisão do App PsiquèIA

Olá,

Obrigado por revisar nosso aplicativo, PsiquèIA. Somos uma plataforma de telessaúde mental que conecta pacientes a psicólogos qualificados.

Para facilitar o teste completo de todas as funcionalidades, fornecemos abaixo duas contas de teste pré-configuradas e um guia passo a passo dos fluxos principais.

---

## 1. Contas de Teste

**Conta de Paciente:**
- **Login:** `revisor.paciente@psiqueia.com`
- **Senha:** `Revisor@Paciente2025`

**Conta de Psicólogo:**
- **Login:** `revisor.psicologo@psiqueia.com`
- **Senha:** `Revisor@Psicologo2025`

**Observação:** A conta do psicólogo já possui o onboarding do Stripe Connect (pagamentos) concluído em modo de teste, permitindo que o fluxo de pagamento seja testado de ponta a ponta.

---

## 2. Guia de Teste Passo a Passo

Recomendamos seguir este fluxo para uma experiência de teste completa:

### Fluxo 1: Agendamento e Pagamento (Visão do Paciente)

1.  **Faça login** com a conta de **paciente**.
2.  Na tela principal (Dashboard), você verá o psicólogo de teste vinculado.
3.  Toque no botão **"Nova Sessão"**.
4.  **Selecione uma data e um horário** disponíveis no futuro.
5.  Toque em **"Agendar Sessão"**. Você será redirecionado para a tela de pagamento.
6.  Na tela de pagamento, toque em **"Pagar com Cartão"**.
7.  Você será levado para a página de checkout da Stripe (em modo de teste).
8.  Use os seguintes dados de **cartão de teste da Stripe**:
    - **Número do Cartão:** `4242 4242 4242 4242`
    - **Data de Validade:** Qualquer data no futuro (ex: 12/30)
    - **CVC:** Qualquer número de 3 dígitos (ex: 123)
    - **Nome no Cartão:** Test User
9.  Após o pagamento, você será redirecionado de volta ao app, para uma tela de sucesso.
10. Vá para a aba **"Agenda"** para ver a sessão confirmada.

### Fluxo 2: Verificação da Sessão (Visão do Psicólogo)

1.  **Faça logout** da conta do paciente.
2.  **Faça login** com a conta de **psicólogo**.
3.  Na aba **"Agenda"**, você verá a sessão que o paciente acabou de agendar.
4.  Na aba **"Financeiro"**, você poderá ver o registro da transação correspondente à sessão.

### Fluxo 3: Diário Emocional e IA (Visão do Paciente)

1.  **Faça login** novamente com a conta de **paciente**.
2.  Vá para a aba **"Diário"**.
3.  Toque no ícone `+` para criar uma nova entrada.
4.  Selecione um humor, escreva um texto e adicione fatores.
5.  Marque a opção **"Compartilhar com meu psicólogo"** e salve.
6.  Aguarde alguns segundos e veja os insights gerados pela IA no card da entrada.

### Fluxo 4: Acesso às Notas do Paciente (Visão do Psicólogo)

1.  **Faça login** com a conta de **psicólogo**.
2.  Vá para a aba **"Pacientes"**.
3.  Selecione a paciente "Maria Silva (Conta de Teste)".
4.  Navegue até a seção **"Diário Compartilhado"** para ver a entrada que o paciente acabou de criar.

---

## 3. Funcionalidades Adicionais para Teste

-   **Recuperação de Senha:** Na tela de login, utilize a função "Esqueci minha senha".
-   **Edição de Perfil:** Tanto o paciente quanto o psicólogo podem editar suas informações de perfil na aba "Perfil".
-   **Exclusão de Conta:** A função de exclusão de conta está disponível no final da tela de "Perfil".

Se precisarem de qualquer informação adicional, por favor, não hesitem em nos contatar.

Atenciosamente,

A Equipe PsiquèIA
