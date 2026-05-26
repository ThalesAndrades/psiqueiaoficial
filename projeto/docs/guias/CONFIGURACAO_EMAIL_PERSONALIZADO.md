# Configuração de Email Personalizado - Psiqueia.com

Este guia explica como configurar emails personalizados com o domínio `psiqueia.com` no Supabase.

## 📧 Configuração de Domínio de Email

### Passo 1: Acessar Configurações de Email no Supabase

1. Acesse o Dashboard do Supabase: https://app.supabase.com
2. Selecione seu projeto (wbwquhhlbjxkhupfphy)
3. Navegue até **Authentication** → **Email Templates**

### Passo 2: Configurar SMTP Customizado

Para usar o domínio `psiqueia.com`, você precisa configurar um servidor SMTP customizado:

#### Opção A: Usar Gmail/Google Workspace (Recomendado)

1. Vá para **Project Settings** → **Authentication** → **SMTP Settings**
2. Habilite **Enable Custom SMTP**
3. Configure:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: `noreply@psiqueia.com` (ou seu email do Google Workspace)
   - **Password**: Senha de aplicativo do Google
   - **Sender email**: `PsiquèIA <noreply@psiqueia.com>`
   - **Sender name**: `PsiquèIA`

#### Opção B: Usar SendGrid

1. Crie uma conta no SendGrid: https://sendgrid.com
2. Verifique o domínio `psiqueia.com`
3. Crie uma API Key
4. Configure no Supabase:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: Sua API Key do SendGrid
   - **Sender email**: `PsiquèIA <noreply@psiqueia.com>`
   - **Sender name**: `PsiquèIA`

#### Opção C: Usar Resend (Moderno e Fácil)

1. Crie uma conta no Resend: https://resend.com
2. Verifique o domínio `psiqueia.com`
3. Crie uma API Key
4. Configure no Supabase:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` ou `587`
   - **Username**: `resend`
   - **Password**: Sua API Key do Resend
   - **Sender email**: `PsiquèIA <noreply@psiqueia.com>`
   - **Sender name**: `PsiquèIA`

### Passo 3: Verificar Domínio

Para usar um domínio personalizado, você precisa adicionar registros DNS:

#### Registros DNS Necessários (exemplo SendGrid/Resend)

```dns
# SPF Record
TXT @ "v=spf1 include:sendgrid.net ~all"

# DKIM Records (fornecidos pelo provedor)
CNAME s1._domainkey em1234.psiqueia.com
CNAME s2._domainkey em5678.psiqueia.com

# DMARC Record
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@psiqueia.com"
```

### Passo 4: Personalizar Templates de Email

No Supabase Dashboard → **Authentication** → **Email Templates**, personalize os templates:

#### Template de Confirmação de Email

```html
<h2>Bem-vindo à PsiquèIA!</h2>
<p>Olá {{ .Name }},</p>
<p>Obrigado por se cadastrar na PsiquèIA. Para confirmar seu email, clique no botão abaixo:</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
  Confirmar Email
</a>
<p>Se você não se cadastrou na PsiquèIA, por favor ignore este email.</p>
<br>
<p>Atenciosamente,<br>Equipe PsiquèIA</p>
```

#### Template de Redefinição de Senha

```html
<h2>Redefinição de Senha - PsiquèIA</h2>
<p>Olá,</p>
<p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
  Redefinir Senha
</a>
<p>Este link expira em 1 hora.</p>
<p>Se você não solicitou a redefinição de senha, por favor ignore este email.</p>
<br>
<p>Atenciosamente,<br>Equipe PsiquèIA</p>
```

#### Template de Convite

```html
<h2>Você foi convidado para a PsiquèIA!</h2>
<p>Olá,</p>
<p>Você recebeu um convite para se juntar à PsiquèIA, a plataforma de transformação do cuidado em saúde mental.</p>
<p><strong>Seu código de convite:</strong> {{ .InvitationCode }}</p>
<p>Use este código ao se cadastrar em nosso aplicativo.</p>
<br>
<p>Atenciosamente,<br>Equipe PsiquèIA</p>
```

## 🔗 Configuração de URLs de Redirecionamento

### Passo 1: Configurar Site URL

No Supabase Dashboard → **Project Settings** → **Authentication** → **URL Configuration**:

- **Site URL**: `https://psiqueia.com` ou `psiqueia://auth` (para mobile)
- **Redirect URLs**: Adicione todas as URLs permitidas:
  - `https://psiqueia.com/*`
  - `https://www.psiqueia.com/*`
  - `psiqueia://auth`
  - `psiqueia:///*`

### Passo 2: Configurar Deep Linking

Para que os links de confirmação funcionem no app mobile, certifique-se de que o `app.json` está configurado:

```json
{
  "expo": {
    "scheme": "psiqueia",
    "ios": {
      "bundleIdentifier": "com.psiqueia.app",
      "associatedDomains": ["applinks:psiqueia.com"]
    },
    "android": {
      "package": "com.psiqueia.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "psiqueia.com",
              "pathPrefix": "/auth"
            },
            {
              "scheme": "psiqueia"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## ✅ Solução Implementada (Atual)

Como alternativa à configuração de email, implementamos um sistema que:

1. **Auto-confirma usuários com convite válido**: Quando um usuário se cadastra com código de convite, o email é confirmado automaticamente
2. **Login automático após cadastro**: Após criar a conta, o usuário já está logado
3. **Sem necessidade de clicar em links**: Elimina o problema de links inválidos

Este sistema oferece melhor experiência de usuário e remove a dependência de configuração de email personalizado para o fluxo de cadastro inicial.

## 📝 Próximos Passos (Opcional)

Se você ainda quiser configurar emails personalizados para:
- Redefinição de senha
- Notificações futuras
- Comunicação com usuários

Siga os passos acima para configurar SMTP customizado com o domínio `psiqueia.com`.

## 🆘 Suporte

Para mais informações sobre configuração de email no Supabase:
- Documentação oficial: https://supabase.com/docs/guides/auth/auth-smtp
- Configuração de provedores: https://supabase.com/docs/guides/auth/auth-email-templates
