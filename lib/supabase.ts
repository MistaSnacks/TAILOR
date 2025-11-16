import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

// Server-side Supabase client with service role (for admin operations)
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null as any;

// Database types (will be generated from Supabase schema)
export type Profile = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  gemini_store_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  parsed_content: any;
  parse_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  description: string;
  required_skills: string[];
  created_at: string;
  updated_at: string;
};

export type ResumeVersion = {
  id: string;
  user_id: string;
  job_id: string;
  template: 'modern' | 'classic' | 'technical';
  content: any;
  docx_url: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AtsScore = {
  id: string;
  resume_version_id: string;
  score: number;
  keyword_match: number;
  semantic_similarity: number;
  analysis: any;
  created_at: string;
};

export type ChatThread = {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: any;
  created_at: string;
};

