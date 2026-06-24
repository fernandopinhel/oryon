import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Tipos derivados do schema (simplificados — expanda conforme necessário)
export type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  location: string | null
  website_url: string | null
  occupation: string | null
  profile_privacy: 'public' | 'connections' | 'private'
  posts_privacy: 'public' | 'connections' | 'private'
  connections_privacy: 'public' | 'connections' | 'private'
  lgpd_accepted_at: string | null
  lgpd_version: string | null
  followers_count: number
  following_count: number
  posts_count: number
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  author_id: string
  group_id: string | null
  parent_id: string | null
  content: string | null
  media_urls: Array<{ url: string; type: string; alt_text?: string }>
  visibility: 'public' | 'connections' | 'private' | 'group'
  post_type: 'text' | 'image' | 'video' | 'link' | 'project_update' | 'poll'
  likes_count: number
  comments_count: number
  shares_count: number
  is_pinned: boolean
  ai_summary: string | null
  created_at: string
  updated_at: string
  // join com profiles
  profiles?: Pick<Profile, 'username' | 'full_name' | 'avatar_url' | 'is_verified'>
}

export type Connection = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  actor_id: string | null
  type: string
  entity_type: string | null
  entity_id: string | null
  message: string | null
  read_at: string | null
  created_at: string
  // join
  actor?: Pick<Profile, 'username' | 'full_name' | 'avatar_url'>
}
