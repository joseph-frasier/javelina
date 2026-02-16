/**
 * Test Fixtures for KB Chunk Metadata
 * 
 * These fixtures test backwards compatibility for the metadata field
 * added to the kb_chunks table. All code must handle:
 * 1. metadata is undefined (old chunks, pre-migration)
 * 2. metadata is null (explicitly no metadata)
 * 3. metadata is populated (post-sync chunks with source info)
 */

import { KBChunk } from '@/types/support';

export const kbChunkFixtures = {
  /**
   * Case 1: No metadata field (pre-migration chunks)
   * This simulates chunks created before the metadata column was added.
   */
  noMetadata: {
    id: 'chunk_1',
    document_id: 'doc_1',
    org_id: null,
    chunk_index: 0,
    chunk_text: 'How to reset your password: Navigate to Settings > Security > Reset Password. You will receive an email with a reset link.',
    embedding: null,
    tokens: 50,
    created_at: '2026-01-30T00:00:00Z',
    // metadata field intentionally omitted
  } as KBChunk,

  /**
   * Case 2: Null metadata (explicitly no metadata)
   * This simulates chunks where metadata is explicitly set to null.
   */
  nullMetadata: {
    id: 'chunk_2',
    document_id: 'doc_2',
    org_id: null,
    chunk_index: 1,
    chunk_text: 'How to add a DNS record: Go to your zone page, click Add Record, select the record type (A, AAAA, CNAME, MX, TXT), and fill in the required fields.',
    embedding: null,
    tokens: 75,
    created_at: '2026-01-30T00:00:00Z',
    metadata: null,
  } as KBChunk,

  /**
   * Case 3: Metadata populated (post-sync chunks with source info)
   * This simulates chunks synced from Freshdesk or other sources with metadata.
   */
  supportMetadata: {
    id: 'chunk_3',
    document_id: 'doc_3',
    org_id: null,
    chunk_index: 0,
    chunk_text: 'Troubleshooting DNS propagation: DNS changes can take 24-48 hours to propagate globally. Use dig or nslookup to check if changes are visible from your location.',
    embedding: null,
    tokens: 120,
    created_at: '2026-01-30T00:00:00Z',
    metadata: {
      source: 'support',
      articleId: 'support_456',
      locale: 'en-US',
    },
  } as KBChunk,

  /**
   * Case 4: Metadata with additional optional fields
   * This tests future extensibility with extra metadata fields.
   */
  extendedMetadata: {
    id: 'chunk_4',
    document_id: 'doc_4',
    org_id: null,
    chunk_index: 2,
    chunk_text: 'Understanding TTL values: Time To Live (TTL) determines how long DNS resolvers cache your records. Lower TTL means faster updates but more DNS queries.',
    embedding: null,
    tokens: 95,
    created_at: '2026-01-30T00:00:00Z',
    metadata: {
      source: 'internal_markdown',
      articleId: 'internal_789',
      locale: 'en-US',
      sectionTitle: 'DNS Basics',
      tags: ['dns', 'ttl', 'caching'],
    },
  } as KBChunk,
};

/**
 * Helper function to safely access metadata properties
 * Use this pattern in production code to avoid runtime errors
 */
export function getChunkMetadataValue<T = unknown>(
  chunk: KBChunk,
  key: string
): T | undefined {
  return chunk.metadata?.[key] as T | undefined;
}

/**
 * Example usage:
 * 
 * const source = getChunkMetadataValue<string>(chunk, 'source');
 * if (source === 'support') {
 *   // Show support badge
 * }
 * 
 * const tags = getChunkMetadataValue<string[]>(chunk, 'tags');
 * if (tags?.includes('dns')) {
 *   // Filter by DNS tag
 * }
 */
