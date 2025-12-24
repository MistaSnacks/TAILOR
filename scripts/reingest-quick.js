// Quick one-liner: Re-ingest all documents
// Copy and paste into browser console (after logging in)

fetch('/api/ingest', { method: 'POST', credentials: 'include' })
  .then(async r => {
    if (!r.ok) {
      const text = await r.text();
      const error = new Error(`HTTP ${r.status}: ${text}`);
      console.error('❌ Request failed:', error);
      throw error;
    }
    return r.json();
  })
  .then(d => console.log('✅ Re-ingestion complete:', d))
  .catch(e => console.error('❌ Error:', e));

// For a specific document:
// fetch('/api/ingest?documentId=<DOCUMENT_ID>', { method: 'POST', credentials: 'include' })
//   .then(async r => {
//     if (!r.ok) {
//       const text = await r.text();
//       const error = new Error(`HTTP ${r.status}: ${text}`);
//       console.error('❌ Request failed:', error);
//       throw error;
//     }
//     return r.json();
//   })
//   .then(d => console.log('✅ Re-ingestion complete:', d))
//   .catch(e => console.error('❌ Error:', e));

// For a full-featured script, use: npx tsx scripts/reingest.ts
