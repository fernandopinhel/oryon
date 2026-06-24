# Oryon — Guia de Deploy

Stack: React/Vite (estático) → HostGator · Supabase (DB + Auth + Realtime + Edge Functions)

---

## 1. Supabase — Criar Projeto

1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Escolha nome, senha forte do banco e região mais próxima (ex.: `South America (São Paulo)`)
3. Aguarde o provisionamento (~2 min)
4. Vá em **Project Settings → API** e anote:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → usado apenas nas Edge Functions (nunca no frontend)

---

## 2. Supabase CLI — Instalar e Conectar

```bash
# Instalar (Node.js já instalado)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto (execute dentro de d:\ferna\Documents\oryon)
supabase link --project-ref SEU_PROJECT_REF
# O PROJECT_REF está na URL do dashboard: https://supabase.com/dashboard/project/SEU_PROJECT_REF
```

> **Alternativa sem CLI:** Execute cada arquivo `.sql` manualmente no
> **SQL Editor** do Dashboard Supabase, na ordem 001 → 004.

---

## 3. Executar as Migrações

```bash
# Executa os 4 arquivos em supabase/migrations/ em ordem
supabase db push
```

Ou no SQL Editor do Dashboard, execute nesta ordem:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage_and_auth.sql`
4. `supabase/migrations/004_realtime.sql`

---

## 4. Deploy das Edge Functions

```bash
# Variável de ambiente para a IA (obrigatório para ai-proxy)
supabase secrets set GROQ_API_KEY=gsk_SUA_CHAVE_GROQ_AQUI

# Deploy das duas funções
supabase functions deploy ai-proxy
supabase functions deploy user-delete
```

Para obter a chave Groq: [console.groq.com](https://console.groq.com) → API Keys → Create.

> As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
> são injetadas automaticamente pelo runtime de Edge Functions — não precisa configurar.

---

## 5. Configurar Autenticação no Dashboard

### 5a. Habilitar Providers

**Authentication → Providers:**

| Provider | Configuração |
|----------|-------------|
| Email    | Habilitar · "Confirm email" = **On** |
| Google   | Habilitar · inserir Client ID e Secret (veja §5b) |
| GitHub   | Habilitar · inserir Client ID e Secret (veja §5b) |

### 5b. Criar OAuth Apps

**Google** → [console.cloud.google.com](https://console.cloud.google.com):
1. APIs & Services → Credentials → Create OAuth Client
2. Application type: **Web**
3. Authorized redirect URIs: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copie o Client ID e Secret para o Supabase Dashboard

**GitHub** → github.com → Settings → Developer Settings → OAuth Apps → New:
1. Homepage URL: `https://seudominio.com.br`
2. Callback URL: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
3. Copie o Client ID e Secret

### 5c. URLs de Redirecionamento

**Authentication → URL Configuration:**

```
Site URL:      https://seudominio.com.br
Redirect URLs:
  https://seudominio.com.br/auth/callback
  http://localhost:5173/auth/callback
```

---

## 6. Variáveis de Ambiente do Frontend

Crie o arquivo `.env.local` em `d:\ferna\Documents\oryon\`:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...sua_anon_key_aqui
VITE_LGPD_VERSION=v1.0
```

> `.env.local` já está no `.gitignore` — nunca commite este arquivo.

---

## 7. Build do Frontend

```bash
cd d:\ferna\Documents\oryon

# Instalar dependências (só precisa na primeira vez)
npm install

# Gerar build de produção
npm run build
```

O resultado estará em `dist/`. Verifique se `dist/.htaccess` existe — ele é copiado de `public/.htaccess` pelo Vite automaticamente.

---

## 8. Upload para HostGator

### Via cPanel File Manager

1. Acesse **cPanel → File Manager → public_html**
2. Clique em **Upload** e faça upload de todos os arquivos da pasta `dist/`
3. Certifique-se que `.htaccess` foi enviado (o cPanel pode ocultar arquivos ocultos — habilite "Show Hidden Files")

### Via FTP (FileZilla — recomendado para muitos arquivos)

```
Host:     ftp.seudominio.com.br
Usuário:  sua_conta_cpanel
Senha:    sua_senha_cpanel
Porta:    21
```

Arraste o **conteúdo** de `dist/` para `public_html/` (não a pasta `dist/` em si — os arquivos devem ficar direto em `public_html/`).

### Estrutura esperada em public_html/

```
public_html/
├── .htaccess       ← SPA routing + HTTPS redirect
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── ...
```

---

## 9. Checklist Pós-Deploy

Execute cada item e confirme que funciona:

- [ ] `https://seudominio.com.br` → redireciona para `/feed` ou tela de login
- [ ] Reload em `/feed` → não retorna 404 (`.htaccess` funcionando)
- [ ] `https://seudominio.com.br` → redireciona para HTTPS (não HTTP)
- [ ] Cadastro com e-mail → recebe e-mail de confirmação
- [ ] Login com Google/GitHub → redireciona corretamente para `/auth/callback`
- [ ] Aceite de LGPD → salvo no banco, não pede novamente
- [ ] Criar post → aparece no feed
- [ ] Reação em post → atualiza otimisticamente
- [ ] Enviar mensagem → recebida em tempo real em outra aba
- [ ] Exportar dados em `/settings/lgpd` → baixa JSON
- [ ] AI: digitar 200+ chars no PostComposer → sugestão de hashtags aparece

---

## 10. Desenvolvimento Local

```bash
# Subir Supabase local (Docker necessário)
supabase start

# Ou usar o projeto Supabase remoto diretamente com .env.local
npm run dev
# → http://localhost:5173
```

---

## Referências Rápidas

| Recurso | URL |
|---------|-----|
| Dashboard Supabase | https://supabase.com/dashboard/project/SEU_PROJECT_REF |
| Logs Edge Functions | Dashboard → Edge Functions → Logs |
| Logs de Auth | Dashboard → Authentication → Logs |
| SQL Editor | Dashboard → SQL Editor |
| Storage | Dashboard → Storage |
