import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  // ── Verifica autenticação ────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Cliente do usuário (respeita RLS)
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Confirmação obrigatória no body ──────────────────────────────────────
  let body: { confirm?: boolean } = {}
  try { body = await req.json() } catch { /* body vazio */ }
  if (!body.confirm) {
    return new Response(JSON.stringify({ error: 'Confirmação ausente' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Service role para deleção sem RLS ────────────────────────────────────
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const uid = user.id

  // Deleta em paralelo (tabelas sem FK dependente de profiles)
  await Promise.all([
    admin.from('reactions').delete().eq('user_id', uid),
    admin.from('notifications').delete().or(`user_id.eq.${uid},actor_id.eq.${uid}`),
    admin.from('direct_messages').delete().or(`sender_id.eq.${uid},recipient_id.eq.${uid}`),
    admin.from('group_members').delete().eq('user_id', uid),
    admin.from('project_members').delete().eq('user_id', uid),
    admin.from('connections').delete().or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
  ])

  // Posts (e tarefas atribuídas) depois das reactions (FK)
  await admin.from('project_tasks').update({ assignee_id: null }).eq('assignee_id', uid)
  await admin.from('posts').delete().eq('author_id', uid)

  // lgpd_consents: tabela imutável por design — retém para auditoria legal
  // Apenas o perfil é anonimizado antes de deletar o auth user
  await admin.from('profiles').delete().eq('id', uid)

  // Deleta a conta de autenticação
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(uid)
  if (deleteAuthError) {
    return new Response(JSON.stringify({ error: deleteAuthError.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
