# Configuração de Assinatura Android para Play Store

## SHA1 Certificado Obrigatório
```
SHA1 Esperado: F6:31:79:34:27:84:36:52:A0:2F:BA:7D:CC:AF:36:9F:11:81:45:E7
```

⚠️ **IMPORTANTE**: Este é o único SHA1 aceito pela Play Store. Qualquer outro será rejeitado.

---

## SOLUÇÃO: Usando o Keystore Correto

### Passo 1: Localize o Keystore Correto

Você precisa do arquivo `.keystore` ou `.jks` que gerou o SHA1 acima. Procure nos seguintes locais:

```bash
# Locais comuns:
~/.android/
~/keystores/
~/Documents/
Seu computador anterior
Backup em nuvem
Repositório privado
```

**Se não encontrar o keystore original:**
- Contate o desenvolvedor que fez o primeiro upload
- Verifique backups antigos
- Como último recurso, use o Google Play App Signing (veja seção abaixo)

### Passo 2: Copiar o Keystore para o Projeto

```bash
# Coloque o keystore na raiz do projeto
cp /caminho/do/seu/keystore.jks ./release.keystore
```

### Passo 3: Criar Arquivo de Credenciais EAS

Crie o arquivo `credentials.json` na raiz do projeto:

```json
{
  "android": {
    "keystore": {
      "keystorePath": "release.keystore",
      "keystorePassword": "SUA_SENHA_KEYSTORE",
      "keyAlias": "SEU_KEY_ALIAS",
      "keyPassword": "SUA_SENHA_KEY"
    }
  }
}
```

**Valores comuns de keyAlias:**
- `upload` ou `key0` (Google Play App Signing)
- `androiddebugkey` (chave de debug - NÃO use em produção)
- Nome do seu app
- `release`

### Passo 4: Build com EAS

```bash
# Build de produção com credenciais locais
eas build --platform android --profile production
```

O EAS usará automaticamente o arquivo `credentials.json`.

### Passo 5: Verificar SHA1 Antes do Upload

**OBRIGATÓRIO**: Sempre verifique o SHA1 antes de enviar para a Play Store:

```bash
# Baixe o AAB gerado pelo EAS
eas build:list

# Ou se fez build local, verifique:
keytool -list -printcert -jarfile app-release.aab | grep SHA1

# O resultado DEVE ser:
SHA1: F6:31:79:34:27:84:36:52:A0:2F:BA:7D:CC:AF:36:9F:11:81:45:E7
```

✅ Se o SHA1 bater → Pode fazer upload
❌ Se o SHA1 for diferente → Repetir processo com keystore correto

---

## ALTERNATIVA: Google Play App Signing (Se perdeu o keystore)

Se você **não conseguir** encontrar o keystore original:

### 1. Entre em Contato com Suporte Google Play

1. Acesse: https://support.google.com/googleplay/android-developer/contact/
2. Selecione: "Problemas com assinatura de app"
3. Explique que precisa resetar a chave de assinatura

**ATENÇÃO**: Este processo pode levar dias e não é garantido.

### 2. Crie Novo App (Último Recurso)

Se não conseguir recuperar:
- Publique como novo app com novo package name
- Migre usuários gradualmente
- Não poderá atualizar o app antigo

---

## Checklist de Segurança

- [ ] Keystore em local seguro (não apenas no projeto)
- [ ] Backup do keystore em 3 locais diferentes
- [ ] Senhas salvas em gerenciador de senhas
- [ ] `.gitignore` configurado para não commitar keystore
- [ ] SHA1 verificado antes de cada upload

## Arquivo .gitignore

Adicione estas linhas ao `.gitignore`:

```
# Arquivos de assinatura - NUNCA committar
*.keystore
*.jks
release.keystore
credentials.json
playstore-service-account.json
google-services.json
GoogleService-Info.plist

# Variáveis de ambiente
.env
.env.local
```
