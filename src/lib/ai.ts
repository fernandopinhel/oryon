import { supabase } from './supabase'

type AgentType =
  | 'summarize_post'
  | 'generate_bio'
  | 'suggest_hashtags'
  | 'project_assistant'
  | 'moderate_content'

interface AIResponse {
  result: string
  agent: AgentType
}

export async function callAI(
  agent: AgentType,
  content: string,
  context?: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<AIResponse>('ai-proxy', {
    body: { agent, content, context },
  })

  if (error) throw new Error(error.message)
  if (!data?.result) throw new Error('Resposta vazia do agente IA')

  return data.result
}

export async function summarizePost(content: string): Promise<string> {
  return callAI('summarize_post', content)
}

export async function generateBio(info: string): Promise<string> {
  return callAI('generate_bio', info)
}

export async function suggestHashtags(postContent: string): Promise<string[]> {
  const raw = await callAI('suggest_hashtags', postContent)
  return raw
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8)
}

export async function askProjectAssistant(
  question: string,
  projectContext: Record<string, unknown>,
): Promise<string> {
  return callAI('project_assistant', question, projectContext)
}
