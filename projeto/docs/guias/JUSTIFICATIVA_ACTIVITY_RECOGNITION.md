# Declaração sobre android.permission.ACTIVITY_RECOGNITION

**Aplicativo:** PsiquèIA  
**Versão:** 1.0.0  
**Data:** 19 de Dezembro de 2025  
**Status da Permissão:** ✅ UTILIZADA

---

## Declaração Oficial

O aplicativo **PsiquèIA solicita e utiliza** a permissão `android.permission.ACTIVITY_RECOGNITION` para a funcionalidade "Bem-Estar Ativo".

### Propósito da Permissão

Esta permissão é utilizada para:

1. **Bem-Estar Ativo:** Funcionalidade que correlaciona dados de atividade física (passos, tipo de atividade) com registros de humor no Diário Emocional.

2. **Insights Personalizados:** Ajudar usuários a entender como exercício físico impacta sua saúde mental.

3. **Compartilhamento com Terapeuta:** Permitir que psicólogos vejam correlações entre atividade física e bem-estar emocional de seus pacientes (com consentimento).

---

## Funcionalidades do Aplicativo

O PsiquèIA é uma **plataforma de terapia online** focada em:

✅ **Agendamento de Sessões**  
✅ **Videochamadas (Google Meet)**  
✅ **Diário Emocional Baseado em Texto**  
✅ **Gestão de Documentos Compartilhados**  
✅ **Pagamentos via Stripe**  
✅ **Bem-Estar Ativo (correlação atividade × humor)**

✅ **Rastreamos atividade física (passos, tipo de atividade)**  
✅ **Acessamos sensores de movimento (com permissão)**  
✅ **Coletamos dados de atividade (não saúde médica)**  
❌ **NÃO usamos GPS ou localização precisa**  
❌ **NÃO compartilhamos dados com terceiros para publicidade**

---

## Permissões Realmente Utilizadas

| Permissão | Justificativa |
|-----------|---------------|
| `CAMERA` | Foto de perfil e documentos |
| `READ_EXTERNAL_STORAGE` | Selecionar fotos da galeria |
| `WRITE_EXTERNAL_STORAGE` | Salvar documentos compartilhados |
| `RECORD_AUDIO` | Áudio em videochamadas |
| `READ_CALENDAR` | Sincronizar agendamentos |
| `WRITE_CALENDAR` | Criar eventos de sessões |
| `ACTIVITY_RECOGNITION` | Correlação atividade × humor (Bem-Estar Ativo) |

---

## Declaração para Google Play Console

**Em Inglês:**

```
PsiquèIA uses the ACTIVITY_RECOGNITION permission to power the "Active Wellness" 
feature, which correlates physical activity data (steps, activity type) with 
emotional well-being recorded in the Emotional Diary.

Purpose:
- Help users understand how physical exercise impacts their mental health
- Provide personalized insights on activity-mood correlations
- Allow therapists to view correlations (with patient consent)

Data Collection:
- Steps count and activity type (walking, running, cycling, resting)
- Data is stored locally and encrypted (AES-256)
- Users can disable this feature anytime in settings

Privacy:
- We do NOT use GPS or precise location
- We do NOT share data with third parties for advertising
- We do NOT sell user data
- Data is used exclusively for therapeutic insights

User Control:
- Prominent disclosure shown before requesting permission
- Users must explicitly opt-in
- Feature can be disabled anytime
- All data can be deleted on request
```

**Em Português:**

```
O PsiquèIA usa a permissão ACTIVITY_RECOGNITION para a funcionalidade "Bem-Estar 
Ativo", que correlaciona dados de atividade física (passos, tipo de atividade) 
com bem-estar emocional registrado no Diário Emocional.

Propósito:
- Ajudar usuários a entender como exercício físico impacta sua saúde mental
- Fornecer insights personalizados sobre correlações atividade-humor
- Permitir que terapeutas vejam correlações (com consentimento do paciente)

Coleta de Dados:
- Contagem de passos e tipo de atividade (caminhada, corrida, ciclismo, repouso)
- Dados armazenados localmente e criptografados (AES-256)
- Usuários podem desativar essa funcionalidade a qualquer momento

Privacidade:
- NÃO usamos GPS ou localização precisa
- NÃO compartilhamos dados com terceiros para publicidade
- NÃO vendemos dados de usuários
- Dados são usados exclusivamente para insights terapêuticos

Controle do Usuário:
- Tela informativa exibida antes de solicitar permissão
- Usuários devem aceitar explicitamente
- Funcionalidade pode ser desativada a qualquer momento
- Todos os dados podem ser excluídos mediante solicitação
```

---

## Resumo para Google Play Console

| Campo | Valor |
|-------|-------|
| **Usa a permissão?** | ✅ SIM |
| **Justificativa** | Funcionalidade "Bem-Estar Ativo" para correlacionar atividade física com bem-estar emocional |
| **Tipo de Dados Coletados** | Passos, tipo de atividade (caminhada/corrida/ciclismo/repouso) |
| **Funcionalidade Afetada se Negada** | Apenas "Bem-Estar Ativo" fica desabilitado (app continua 100% funcional) |

---

## Próximos Passos

1. ✅ **Adicionar permissão ao app.json** (CONCLUÍDO)
2. ✅ **Implementar tela de Prominent Disclosure** (CONCLUÍDO)
3. ✅ **Implementar solicitação de permissão em runtime** (CONCLUÍDO)
4. ✅ **Criar funcionalidade Bem-Estar Ativo** (CONCLUÍDO)
5. ⏳ **Gerar novo build EAS com a permissão**
6. ⏳ **Criar vídeo demonstrativo da funcionalidade**
7. ⏳ **Submeter ao Google Play Console**

---

## Verificação Técnica

Para confirmar que a permissão foi adicionada corretamente após o build:

```bash
# Após gerar o APK
eas build --platform android --profile production

# Baixar o APK e verificar
unzip app-release.apk -d extracted
cat extracted/AndroidManifest.xml | grep ACTIVITY_RECOGNITION
# Deve retornar: <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
```

---

## Contato

Em caso de dúvidas sobre esta declaração, entre em contato:

**Email:** contato@psiqueia.com  
**Desenvolvedor:** PsiquèIA  
**Data de Atualização:** 19/12/2025
