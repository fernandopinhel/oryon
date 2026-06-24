// ============================================================
// ORYON — Edge Function: AI Proxy
// Protege as chaves de API (Groq/Gemini) do frontend
// Deploy: supabase functions deploy ai-proxy
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting simples em memória (reinicia com cada instância fria)
// Para produção, usar Supabase KV ou Redis
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// Tipos de agentes disponíveis
type AgentType =
  | "summarize_post"
  | "generate_bio"
  | "suggest_hashtags"
  | "project_assistant"
  | "moderate_content";

interface AIRequest {
  agent: AgentType;
  content: string;
  context?: Record<string, unknown>;
}

// Monta o prompt adequado para cada agente
function buildPrompt(agent: AgentType, content: string, context?: Record<string, unknown>): {
  systemPrompt: string;
  userPrompt: string;
  model: string;
} {
  switch (agent) {
    case "summarize_post":
      return {
        model: "llama3-8b-8192",
        systemPrompt: "Você é um assistente que resume textos de forma concisa. Responda sempre em Português (BR). Seja direto e objetivo.",
        userPrompt: `Resuma o seguinte post em 2-3 frases curtas, mantendo os pontos principais:\n\n${content}`,
      };

    case "generate_bio":
      return {
        model: "llama3-8b-8192",
        systemPrompt: "Você cria bios profissionais e atraentes para perfis de redes sociais em Português (BR). Seja criativo, mas profissional.",
        userPrompt: `Crie uma bio para perfil com base nestas informações:\n${content}\n\nGere 3 opções diferentes de bio (máximo 160 caracteres cada).`,
      };

    case "suggest_hashtags":
      return {
        model: "llama3-8b-8192",
        systemPrompt: "Você sugere hashtags relevantes para posts de redes sociais em Português (BR).",
        userPrompt: `Para o seguinte post, sugira 5-8 hashtags relevantes (sem o #, apenas as palavras, separadas por vírgula):\n\n${content}`,
      };

    case "project_assistant":
      return {
        model: "llama3-70b-8192",
        systemPrompt: `Você é um assistente de gerenciamento de projetos especializado em metodologias ágeis.
Contexto do projeto: ${JSON.stringify(context ?? {})}
Responda sempre em Português (BR). Seja prático e específico.`,
        userPrompt: content,
      };

    case "moderate_content":
      return {
        model: "llama3-8b-8192",
        systemPrompt: `Você é um moderador de conteúdo. Analise o texto e retorne um JSON com:
{ "safe": boolean, "reason": string | null, "severity": "none"|"low"|"medium"|"high" }
Categorias problemáticas: ódio, violência, spam, conteúdo adulto explícito.`,
        userPrompt: `Analise: ${content}`,
      };

    default:
      throw new Error(`Agente desconhecido: ${agent}`);
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar JWT do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token de autorização ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    if (!checkRateLimit(user.id, 10)) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // Parse do body
    const body: AIRequest = await req.json();
    if (!body.agent || !body.content) {
      return new Response(JSON.stringify({ error: "Campos 'agent' e 'content' são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limite de tamanho do conteúdo
    if (body.content.length > 8000) {
      return new Response(JSON.stringify({ error: "Conteúdo muito longo (máx 8000 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { systemPrompt, userPrompt, model } = buildPrompt(body.agent, body.content, body.context);

    // Chama a API do Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq error:", err);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqData = await groqResponse.json();
    const result = groqData.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ result, agent: body.agent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
