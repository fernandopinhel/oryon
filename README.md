# Oryon — Rede Social Profissional

> Plataforma de rede social Jamstack com feed, grupos, projetos colaborativos e IA.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

---

## Visão geral

O **Oryon** é uma rede social profissional construída como aplicação estática (SPA) hospedada em
shared hosting (HostGator), usando o Supabase como backend completo — sem servidor Node.js dedicado.

### Funcionalidades principais

| Módulo | Descrição |
|--------|-----------|
| **Feed** | Posts com texto, imagens, reações e comentários. Visibilidade pública/conexões/privado |
| **Perfil** | Foto, bio, ocupação, portfólio, privacidade granular, modo escuro/claro |
| **Conexões** | Pedidos de conexão, aceitar/rejeitar, badge com contagem pendente |
| **Grupos** | Públicos, privados e secretos. Admin, moderador e membro |
| **Projetos** | Kanban (ToDo → Em andamento → Revisão → Concluído), membros com permissões por cargo |
| **Mensagens** | Chat direto em tempo real (Supabase Realtime), upload de mídia, indicador de presença |
| **Notificações** | Centro de notificações com tempo real |
| **IA** | Geração de bio por LLaMA 3 via Groq API (Edge Function) |
| **Analytics** | Google Analytics 4 + GTM + Hotjar com consentimento LGPD |

---

## Stack técnica

```
Frontend          React 18 + Vite 5 + TypeScript strict
Estilização       Tailwind CSS 3 + CSS Variables (dark mode)
Estado            Zustand (authStore, themeStore, consentStore, presenceStore, …)
Roteamento        React Router 6
Backend           Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
IA                Groq API — LLaMA 3 (via Edge Function ai-proxy)
Deploy            npm run build → dist/ → upload FTP para HostGator
```

---

## Estrutura do projeto

```
oryon/
├── public/
│   ├── favicon.svg
│   └── .htaccess               # SPA routing + HTTPS + cache headers (Apache)
├── src/
│   ├── components/
│   │   ├── consent/            # CookieBanner (LGPD)
│   │   ├── layout/             # Navbar, Sidebar, MobileNav, AppLayout
│   │   ├── messages/           # FloatingChat, ConversationList
│   │   ├── posts/              # PostCard, PostEditor
│   │   └── ui/                 # Toast, ConfirmDialog, etc.
│   ├── hooks/
│   │   ├── useAnalytics.ts     # Reage ao consentimento e carrega GA4/Hotjar
│   │   ├── useProject.ts       # Estado e ações de projeto individual
│   │   ├── useProjects.ts      # Listagem de projetos
│   │   ├── useMessages.ts      # Chat direto + mark-as-read
│   │   └── useConversations.ts # Lista de conversas
│   ├── lib/
│   │   ├── analytics.ts        # Loader GTM / Hotjar / Consent Mode v2
│   │   ├── errors.ts           # Tradução de erros Supabase → português
│   │   ├── supabase.ts         # Cliente Supabase tipado
│   │   └── ai.ts               # Chamada ao Edge Function de IA
│   ├── pages/
│   │   ├── auth/               # Login, Register, AuthCallback, LgpdConsent
│   │   ├── groups/             # GroupList, GroupDetail, CreateGroup, GroupEdit
│   │   ├── projects/           # ProjectList, ProjectDetail, CreateProject, EditProject
│   │   └── settings/           # AccountSettings, PrivacySettings, LgpdSettings
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── consentStore.ts     # Consentimento de cookies (persist)
│   │   ├── themeStore.ts       # Dark/light mode (persist)
│   │   ├── presenceStore.ts    # Online/away/busy/offline
│   │   └── unreadMessagesStore.ts
│   └── types/
│       └── analytics.d.ts      # Tipos para window.gtag / window.hj
├── supabase/
│   ├── functions/
│   │   ├── ai-proxy/           # Edge Function — Groq API (LLaMA 3)
│   │   └── user-delete/        # Edge Function — exclusão LGPD
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_storage_and_auth.sql
│       ├── 004_realtime.sql
│       ├── 005_chat_media.sql
│       └── 006_fixes.sql       # Fix dm_update RLS + SECURITY DEFINER + projects_update
├── .env.example
├── PRIVACY_POLICY.md
└── README.md
```

---

## Configuração local

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com projeto criado

### Instalação

```bash
git clone https://github.com/SEU_USUARIO/oryon.git
cd oryon
npm install
```

### Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# Supabase — Project Settings > API
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Versão dos termos LGPD
VITE_LGPD_VERSION=v1.0

# Telemetria (opcional)
VITE_GTM_ID=GTM-XXXXXXX
VITE_HOTJAR_ID=1234567
VITE_HOTJAR_VERSION=6
```

### Banco de dados

No Supabase SQL Editor, execute as migrações em ordem:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage_and_auth.sql
supabase/migrations/004_realtime.sql
supabase/migrations/005_chat_media.sql
supabase/migrations/006_fixes.sql
```

### Desenvolvimento

```bash
npm run dev       # http://localhost:5173
npm run build     # gera dist/
npm run preview   # preview do build
```

---

## Deploy (HostGator)

1. `npm run build`
2. Envie o conteúdo de `dist/` para `public_html/` via FTP ou Gerenciador de Arquivos do cPanel
3. O `.htaccess` já está incluído no build (SPA routing + HTTPS redirect)

### Configuração do Supabase para produção

Em **Authentication → URL Configuration**:
- **Site URL:** `https://seu-dominio.com.br`
- **Redirect URLs:** `https://seu-dominio.com.br/**` e `http://localhost:5173/**`

---

## Autenticação OAuth

Suporta login via **Google** e **GitHub**. Configure os providers em:

Supabase → Authentication → Sign In / Providers → Google / GitHub

---

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` `/register` | Autenticação |
| `/feed` | Feed principal |
| `/perfil/:username` | Perfil público |
| `/conexoes` | Gerenciar conexões |
| `/grupos` `/grupos/:id` | Grupos |
| `/projetos` `/projetos/:id` | Projetos + Kanban |
| `/mensagens` `/mensagens/:userId` | Chat direto |
| `/notificacoes` | Notificações |
| `/buscar` | Busca global |
| `/configuracoes` | Conta, aparência, privacidade, LGPD |

---

## Banco de dados — tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Extensão de `auth.users` |
| `connections` | Conexões bidirecionais |
| `groups` / `group_members` | Grupos e membros |
| `posts` / `reactions` | Feed |
| `projects` / `project_members` / `project_tasks` | Projetos Kanban |
| `direct_messages` | Chat direto |
| `notifications` | Centro de notificações |
| `lgpd_consents` | Log imutável de consentimentos |

Todas as tabelas têm **Row Level Security (RLS)** ativo. Funções SECURITY DEFINER com `SET search_path = public`.

---

## LGPD / Privacidade

- Cookie consent banner nas páginas públicas (antes do login)
- Gerenciamento de preferências em **Configurações → Dados & LGPD**
- GTM Consent Mode v2 — scripts bloqueados até consentimento explícito
- Cookies de analytics/heatmaps removidos na revogação
- Exportação de dados (JSON) e exclusão de conta disponíveis em configurações
- Política completa em [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

---

## Licença

Projeto privado — todos os direitos reservados © 2026 Fernando Pinhel.
