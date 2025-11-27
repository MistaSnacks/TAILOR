// Quick one-liner: Re-ingest all documents
// Copy and paste into browser console (after logging in)

fetch('/api/ingest', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log('✅ Re-ingestion complete:', d))
  .catch(e => console.error('❌ Error:', e));

// For a specific document:
// fetch('/api/ingest?documentId=<DOCUMENT_ID>', { method: 'POST' })
//   .then(r => r.json())
//   .then(d => console.log('✅ Re-ingestion complete:', d))
//   .catch(e => console.error('❌ Error:', e));

// For a full-featured script, use: npx tsx scripts/reingest.ts
