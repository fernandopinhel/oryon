# Política de Privacidade — Oryon

**Última atualização:** Junho de 2026  
**Versão:** v1.0

---

## 1. Quem somos

O **Oryon** é uma plataforma de rede social desenvolvida por Fernando Pinhel, acessível em `oryon.fernandopinhel.com.br`. Esta política explica quais dados coletamos, por que coletamos e como o usuário pode exercer seus direitos garantidos pela **LGPD (Lei nº 13.709/2018)**.

---

## 2. Dados coletados

### 2.1 Dados fornecidos pelo usuário (base legal: contrato/consentimento)

| Dado | Finalidade |
|------|-----------|
| Nome completo e username | Identificação na plataforma |
| E-mail | Autenticação e comunicações |
| Foto de perfil | Exibição pública no perfil |
| Bio, ocupação, localização | Personalização do perfil |
| Conteúdo postado (textos, imagens) | Funcionamento do feed social |
| Mensagens diretas | Comunicação entre usuários |

### 2.2 Dados de uso — Analytics (base legal: consentimento)

Coletados **somente** após consentimento explícito via banner de cookies.

| Ferramenta | O que coleta | Finalidade |
|-----------|-------------|-----------|
| **Google Analytics 4 (GA4)** | Páginas visitadas, tempo de sessão, dispositivo/SO/browser, localização aproximada (cidade), eventos de clique | Entender como os usuários navegam para melhorar a experiência |
| **Google Tag Manager (GTM)** | Gerenciador de tags — não coleta dados por si só; controla quando GA4 e Hotjar são ativados | Centralizar e controlar scripts de terceiros conforme o consentimento |
| **Hotjar** | Mapas de calor (onde os usuários clicam), gravação de sessão anônima, scroll depth | Identificar problemas de usabilidade e otimizar a interface |

> **Hotjar:** conteúdo de formulários, campos de senha e dados sensíveis são automaticamente mascarados. Nenhuma gravação contém dados pessoais identificáveis.

### 2.3 Dados técnicos essenciais (base legal: interesse legítimo)

Processados automaticamente para o funcionamento da plataforma:
- Tokens de sessão (Supabase Auth)
- Logs de erro (client-side apenas)
- Configurações locais (tema, preferências de cookies — armazenados no `localStorage` do seu dispositivo)

---

## 3. Cookies utilizados

### Cookies essenciais (sempre ativos)

| Cookie | Origem | Duração | Finalidade |
|--------|--------|---------|-----------|
| `sb-*` | Supabase | Sessão | Autenticação e sessão do usuário |
| `oryon-theme` | Oryon | Persistente | Preferência de tema (claro/escuro) |
| `oryon-consent` | Oryon | 1 ano | Registro do consentimento de cookies |

### Cookies de analytics (requerem consentimento)

| Cookie | Origem | Duração | Finalidade |
|--------|--------|---------|-----------|
| `_ga` | Google | 2 anos | Distingue usuários únicos |
| `_ga_*` | Google | 2 anos | Mantém estado da sessão GA4 |
| `_gid` | Google | 24 horas | Distingue usuários (sessão) |

### Cookies de heatmaps (requerem consentimento)

| Cookie | Origem | Duração | Finalidade |
|--------|--------|---------|-----------|
| `_hjid` | Hotjar | 1 ano | ID único de visitante |
| `_hjSession*` | Hotjar | 30 min | Estado da sessão de gravação |

---

## 4. Com quem compartilhamos os dados

| Destinatário | Dados compartilhados | Base legal |
|-------------|---------------------|-----------|
| **Supabase** (EUA/UE) | Todos os dados da plataforma | Contrato — processador de dados |
| **Google LLC** (EUA) | Dados de analytics (anonimizados) | Consentimento |
| **Hotjar Ltd** (Malta/UE) | Sessões de gravação anônimas | Consentimento |

Nenhum dado é **vendido** a terceiros. Todos os fornecedores acima possuem mecanismos de transferência internacional conformes à LGPD (cláusulas contratuais padrão).

---

## 5. Direitos do usuário (LGPD — Art. 18)

Você pode exercer os seguintes direitos a qualquer momento:

| Direito | Como exercer |
|---------|-------------|
| **Acesso** — saber quais dados temos sobre você | Envie e-mail para `privacidade@oryon.app` |
| **Correção** — atualizar dados incorretos | Acesse **Configurações → Editar perfil** |
| **Exclusão** — remover sua conta e dados | Acesse **Configurações → Dados & LGPD → Solicitar exclusão** |
| **Portabilidade** — exportar seus dados | Acesse **Configurações → Dados & LGPD → Exportar dados** |
| **Revogação de consentimento** | Clique no botão **Cookies** (canto inferior direito) a qualquer momento |
| **Oposição** | Envie e-mail para `privacidade@oryon.app` |

---

## 6. Retenção de dados

| Tipo de dado | Período de retenção |
|-------------|-------------------|
| Dados da conta ativa | Enquanto a conta existir |
| Dados após solicitação de exclusão | Até 30 dias (conforme LGPD) |
| Logs de consentimento (LGPD) | 5 anos (obrigação legal) |
| Cookies de analytics | Conforme tabela na seção 3 |

---

## 7. Segurança

- Comunicações protegidas por **HTTPS/TLS**
- Senhas nunca armazenadas (autenticação via Supabase Auth com bcrypt)
- Políticas de Row Level Security (RLS) no banco de dados
- Acesso restrito por função (owner, manager, contributor, viewer)

---

## 8. Menores de idade

O Oryon não é direcionado a menores de 18 anos. Se identificarmos dados de menores sem consentimento parental, os dados serão excluídos imediatamente.

---

## 9. Contato e Encarregado de Dados (DPO)

**Responsável:** Fernando Pinhel  
**E-mail:** `privacidade@oryon.app`  
**Prazo de resposta:** até 15 dias úteis

---

## 10. Alterações nesta política

Qualquer alteração relevante será comunicada via notificação na plataforma e/ou e-mail cadastrado. O uso continuado após a notificação implica aceite da versão atualizada.
