# Oryon — Rede Social Jamstack
## Plano de Projeto Completo

---

## 1. VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Browser)                        │
│                   React SPA (Vite → Estático)                   │
└──────────┬────────────────────────┬────────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐    ┌──────────────────────────────────────┐
│   HostGator      │    │            Supabase (Free Tier)       │
│  Apache/PHP      │    │  ┌─────────┐ ┌────────┐ ┌─────────┐ │
│  (arquivos .html │    │  │ PostgREST│ │  Auth  │ │ Storage │ │
│   .js .css)      │    │  │  (REST)  │ │  JWT   │ │  (S3)   │ │
│                  │    │  └─────────┘ └────────┘ └─────────┘ │
│  .htaccess SPA   │    │  ┌─────────┐ ┌─────────────────────┐ │
│  routing fix     │    │  │Realtime │ │  Edge Functions      │ │
└──────────────────┘    │  │(WebSocket│ │  (AI proxy seguro)  │ │
                        │  └─────────┘ └─────────────────────┘ │
                        └──────────────────────────────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────────┐
                        │     APIs de IA (Free Tier)   │
                        │  Groq (LLaMA 3) + Gemini 1.5 │
                        │  via Supabase Edge Function   │
                        └──────────────────────────────┘
```

### Por que essa arquitetura?
- **HostGator** apenas serve arquivos estáticos — React/Vite gera exatamente isso
- **Supabase** substitui 100% o backend: banco, auth, storage, realtime e serverless functions
- **AI via Edge Function** protege as chaves de API (não exposta no frontend)

---

## 2. STACK TECNOLÓGICA

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | React 18 + Vite | Build estático, ecossistema maduro |
| Roteamento | React Router v6 | Hash routing (`#/`) funciona em Apache sem config |
| Estado Global | Zustand | Leve, sem boilerplate |
| UI/Estilo | Tailwind CSS | Utilitário, sem servidor CSS necessário |
| Componentes | shadcn/ui (radix) | Acessível, customizável |
| DB/Backend | Supabase (PostgreSQL) | Free tier: 500MB DB, 1GB storage, 2GB bandwidth |
| Auth | Supabase Auth | JWT, OAuth (Google/GitHub), Magic Link grátis |
| Storage | Supabase Storage | Avatares, imagens de posts, anexos |
| Realtime | Supabase Realtime | Notificações, mensagens ao vivo |
| AI | Groq API + Gemini Flash | Free tier generoso, latência baixa |
| AI Proxy | Supabase Edge Functions | Deno runtime, protege API keys |
| Deploy | HostGator via FTP/cPanel | Upload do build `dist/` |

---

## 3. ESTRUTURA DE PASTAS

```
oryon/
├── docs/                          # Documentação do projeto
│   ├── 00_PROJECT_PLAN.md
│   ├── 01_DATABASE_SCHEMA.sql
│   ├── 02_RLS_POLICIES.sql
│   ├── 03_EDGE_FUNCTIONS.md
│   └── 04_DEPLOYMENT.md
│
├── supabase/                      # Config e migrações do Supabase
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions.sql
│   └── functions/
│       └── ai-proxy/
│           └── index.ts           # Edge Function para AI
│
├── src/                           # Código fonte React
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Client Supabase configurado
│   │   ├── ai.ts                  # Chamadas para AI via Edge Function
│   │   └── utils.ts
│   │
│   ├── store/                     # Zustand stores
│   │   ├── authStore.ts
│   │   ├── feedStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── hooks/                     # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useFeed.ts
│   │   ├── useConnections.ts
│   │   ├── useGroup.ts
│   │   └── useRealtime.ts
│   │
│   ├── components/                # Componentes reutilizáveis
│   │   ├── ui/                    # shadcn/ui primitivos
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── feed/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostComposer.tsx
│   │   │   └── ReactionBar.tsx
│   │   ├── profile/
│   │   │   ├── ProfileHeader.tsx
│   │   │   └── ConnectionButton.tsx
│   │   ├── groups/
│   │   │   ├── GroupCard.tsx
│   │   │   └── GroupHeader.tsx
│   │   ├── projects/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── ProjectSidebar.tsx
│   │   └── ai/
│   │       ├── AIAssistant.tsx
│   │       └── SummaryButton.tsx
│   │
│   └── pages/                     # Páginas (rotas)
│       ├── Landing.tsx
│       ├── auth/
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   └── LgpdConsent.tsx
│       ├── Feed.tsx
│       ├── Profile.tsx
│       ├── EditProfile.tsx
│       ├── Connections.tsx
│       ├── Groups/
│       │   ├── GroupList.tsx
│       │   ├── GroupDetail.tsx
│       │   └── CreateGroup.tsx
│       ├── Projects/
│       │   ├── ProjectList.tsx
│       │   ├── ProjectDetail.tsx
│       │   └── CreateProject.tsx
│       ├── Messages.tsx
│       ├── Notifications.tsx
│       ├── Search.tsx
│       └── settings/
│           ├── AccountSettings.tsx
│           ├── PrivacySettings.tsx
│           └── LgpdSettings.tsx
│
├── public/
│   ├── .htaccess                  # CRÍTICO: SPA routing no Apache
│   └── assets/
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. ROTAS DA APLICAÇÃO

| Rota | Componente | Auth? | Descrição |
|---|---|---|---|
| `/` | `Landing` / `Feed` | Opt. | Landing p/ deslogado, Feed p/ logado |
| `/login` | `Login` | Não | Login com email, OAuth |
| `/register` | `Register` | Não | Cadastro |
| `/lgpd-consent` | `LgpdConsent` | Sim | Aceite obrigatório pós-cadastro |
| `/feed` | `Feed` | Sim | Timeline principal |
| `/profile/:username` | `Profile` | Opt. | Perfil público/privado |
| `/profile/edit` | `EditProfile` | Sim | Edição de perfil |
| `/connections` | `Connections` | Sim | Conexões, pendentes, sugestões |
| `/groups` | `GroupList` | Opt. | Explorar grupos |
| `/groups/create` | `CreateGroup` | Sim | Criar grupo |
| `/groups/:id` | `GroupDetail` | Opt. | Feed do grupo |
| `/projects` | `ProjectList` | Sim | Meus projetos |
| `/projects/create` | `CreateProject` | Sim | Criar projeto |
| `/projects/:id` | `ProjectDetail` | Sim | Kanban + membros |
| `/messages` | `Messages` | Sim | Inbox de DMs |
| `/messages/:userId` | `Messages` | Sim | Conversa específica |
| `/notifications` | `Notifications` | Sim | Central de notificações |
| `/search` | `Search` | Opt. | Busca global |
| `/settings` | `AccountSettings` | Sim | Configurações de conta |
| `/settings/privacy` | `PrivacySettings` | Sim | Privacidade e visibilidade |
| `/settings/lgpd` | `LgpdSettings` | Sim | Exportar/excluir dados (LGPD) |
| `*` | `NotFound` | — | 404 |

---

## 5. AGENTES DE IA

### Arquitetura de Segurança
```
Browser → Supabase Edge Function (autenticada) → Groq/Gemini API
                     ↑
              Valida JWT do usuário
              Rate limit por user_id
              Chaves de API nunca saem do servidor
```

### Agentes Planejados

| Agente | Trigger | Modelo | Descrição |
|---|---|---|---|
| **Resumo de Post** | Botão "Resumir" em posts longos | Groq LLaMA 3 8B | Resume posts >500 chars em 2-3 linhas |
| **Assistente de Projeto** | Chat dentro de projeto | Groq LLaMA 3 70B | Sugere tarefas, estima prazos, organiza backlog |
| **Gerador de Bio** | Edição de perfil | Gemini Flash | Sugere biografia baseada em interesses do usuário |
| **Moderação** | Background após criação de post | Gemini Flash | Detecta conteúdo impróprio (NSFW, ódio) |
| **Hashtag Suggester** | Compositor de post | Groq LLaMA 3 8B | Sugere hashtags relevantes ao digitar |

---

## 6. FLUXO LGPD

```
Registro
   ↓
Email confirmado (Supabase Auth)
   ↓
Redirect → /lgpd-consent
   ↓
Usuário lê e aceita Termos + Política de Privacidade
   ↓
INSERT em lgpd_consents (versão, timestamp, ip_hash)
   ↓
UPDATE profiles.lgpd_accepted_at
   ↓
Redirect → /feed

/settings/lgpd disponibiliza:
  • Exportar todos os dados (JSON)
  • Solicitar exclusão de conta (soft delete → hard delete em 30 dias)
  • Revogar consentimento de marketing (se houver)
  • Ver histórico de consentimentos
```

---

## 7. PRÓXIMOS PASSOS (Ordem de Execução)

- [x] 00. Plano de projeto
- [ ] 01. Schema do banco de dados (SQL)
- [ ] 02. Políticas RLS do Supabase
- [ ] 03. Configuração do Supabase Auth
- [ ] 04. Scaffold do projeto React/Vite
- [ ] 05. Supabase Edge Functions (AI proxy)
- [ ] 06. Componentes de layout e autenticação
- [ ] 07. Feed e posts
- [ ] 08. Perfis e conexões
- [ ] 09. Grupos
- [ ] 10. Projetos (Kanban)
- [ ] 11. Mensagens diretas (Realtime)
- [ ] 12. Integração de agentes IA
- [ ] 13. Configurações e LGPD
- [ ] 14. Build e deploy para HostGator
