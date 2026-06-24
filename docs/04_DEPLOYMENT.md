# Deploy: Vite → HostGator

## 1. Configuração do .htaccess (CRÍTICO para SPA)

Crie `public/.htaccess` com o conteúdo abaixo.
Sem isso, ao acessar `/feed` diretamente o Apache retorna 404.

```apache
Options -MultiViews
RewriteEngine On

# Redireciona HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Serve arquivos e pastas existentes diretamente
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Tudo mais vai para index.html (SPA routing)
RewriteRule ^ index.html [L]
```

## 2. vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Chunks menores para carregamento mais rápido
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
```

## 3. Processo de Deploy

```bash
# Build do projeto
npm run build

# A pasta dist/ gerada contém:
# dist/
#   index.html
#   assets/
#     index-[hash].js
#     index-[hash].css
#   .htaccess  (copiado do public/)

# Upload via cPanel File Manager ou FTP:
# Destino: public_html/ (domínio raiz) ou public_html/oryon/ (subpasta)
```

## 4. Variáveis de Ambiente

Crie `.env.local` (não committar no git):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> As variáveis `VITE_*` são embutidas no bundle durante o build.
> A `ANON_KEY` é segura para expor — o RLS protege os dados.

## 5. Supabase Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Definir secrets (chaves de API nunca no código)
supabase secrets set GROQ_API_KEY=gsk_...

# Deploy da function
supabase functions deploy ai-proxy --no-verify-jwt
```

## 6. Checklist pré-deploy

- [ ] `.env.local` com URLs corretas do Supabase
- [ ] Migrações rodadas no Supabase (`supabase db push`)
- [ ] Edge Function deployada e secrets configurados
- [ ] `public/.htaccess` presente e correto
- [ ] Build gerado sem erros (`npm run build`)
- [ ] Testar localmente com `npm run preview`
- [ ] Upload da pasta `dist/` para `public_html/`
- [ ] Testar rotas diretas (ex: acessar `/feed` direto na URL)
