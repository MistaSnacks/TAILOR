import { supabaseAdmin } from './supabase';
import { embedText, GeminiFileReference } from './openai';

export const MAX_CHUNK_SIZE = 800;
export const MAX_CHUNKS_PER_DOCUMENT = 24;
export const MIN_CHUNK_LENGTH = 120;

// Canonical profile tuning
export const MAX_CANONICAL_BULLETS = 20;
export const MAX_CANONICAL_SKILLS = 60; // Increased to support 40+ skills in resumes
export const BULLET_SIMILARITY_THRESHOLD = 0.82;

export type RetrievedChunk = {
  document_id: string;
  chunk_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  gemini_file_uri: string | null;
  chunk_mime_type: string | null;
};

export async function getRelevantChunks(
  userId: string,
  query: string,
  limit = 8
): Promise<{ chunks: RetrievedChunk[]; embedding: number[] }> {
  const embedding = await embedText(query);

  const { data, error } = await supabaseAdmin.rpc('match_document_chunks', {
    user_uuid: userId,
    query_embedding: embedding,
    match_count: limit,
  });

  if (error) {
    console.error('❌ Chunk match error:', error);
    return { chunks: [], embedding };
  }

  return { chunks: (data as RetrievedChunk[]) || [], embedding };
}

export function mapChunksToFileRefs(chunks: RetrievedChunk[]): GeminiFileReference[] {
  return chunks
    .filter((chunk) => !!chunk.gemini_file_uri)
    .map((chunk) => ({
      uri: chunk.gemini_file_uri as string,
      mimeType: chunk.chunk_mime_type || 'text/plain',
    }));
}


