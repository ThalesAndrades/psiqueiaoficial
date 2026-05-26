# 🔧 Correção TabBar Paciente - Tabs Ocultas Aparecendo

## 🐛 Problema Identificado

As tabs que deveriam estar ocultas (diário, plano, chat-ai, documentos) estavam aparecendo no TabBar com seus nomes de arquivo como labels.

### Evidência Visual
```
┌────────────────────────────────────────────────────────┐
│  🏠      ⊕       📅      👤   diario  plano  chat-ai   │
│ Início  Agendar  Agenda  Perfil  (tabs vazias visíveis)│
└────────────────────────────────────────────────────────┘
```

### Causa Raiz
Usar apenas `href: null` não remove a tab do TabBar - apenas remove do linking/routing. A tab ainda era renderizada sem ícone nem título configurado, aparecendo com o nome do arquivo.

---

## ✅ Solução Implementada

### Código Anterior (❌ Incorreto)
```typescript
<Tabs.Screen
  name="diario"
  options={{
    href: null, // Só remove do linking, não esconde do TabBar
  }}
/>
```

### Código Corrigido (✅ Correto)
```typescript
<Tabs.Screen
  name="diario"
  options={{
    href: null,
    tabBarButton: () => null, // Remove completamente do TabBar
  }}
/>
```

### O que `tabBarButton: () => null` faz?
- **Remove completamente** o botão da tab do TabBar
- A screen continua existindo e acessível via navegação programática
- Não renderiza nenhum componente visual no TabBar

---

## 🎯 Tabs Afetadas

Aplicada correção em 4 tabs:

1. **diario** - Registro emocional diário
2. **plano** - Plano de cuidado
3. **chat-ai** - Assistente IA
4. **documentos** - Documentos compartilhados

---

## 📱 Estrutura Final

### Tabs Visíveis (4)
```
┌─────────────────────────────────────────┐
│  🏠      ⊕       📅         👤         │
│ Início  Agendar  Agenda    Perfil      │
└─────────────────────────────────────────┘
```

### Navegação para Tabs Ocultas
```typescript
// Via Router
router.push('/(patient)/diario');
router.push('/(patient)/plano');
router.push('/(patient)/chat-ai');
router.push('/(patient)/documentos');

// Via Link
<Link href="/(patient)/diario">Abrir Diário</Link>
```

---

## ✅ Resultado

TabBar do paciente agora exibe **APENAS** as 4 tabs principais:
- ✅ Início
- ✅ Agendar (CTA)
- ✅ Agenda
- ✅ Perfil

Tabs secundárias totalmente ocultas mas acessíveis via navegação programática.

**Status:** ✅ **CORRIGIDO E PRONTO**

---

*Correção aplicada: Dezembro 2025*
