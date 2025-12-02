/**
 * Browser Console Script: Re-ingest Documents
 * 
 * Copy and paste this entire script into your browser console while on the TAILOR app.
 * It will re-process all your completed documents with the latest ingestion logic.
 * 
 * What gets re-ingested:
 *   ✅ Experiences and bullets (with embeddings)
 *   ✅ Skills (normalized and deduped)
 *   ✅ Education (with start/end dates if available)
 *   ✅ Certifications
 *   ✅ Contact information (name, email, phone, linkedin, portfolio)
 *   ❌ Address (intentionally excluded for privacy)
 * 
 * Usage:
 *   1. Open browser console (Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux)
 *   2. Make sure you're logged into TAILOR
 *   3. Paste this entire script and press Enter
 * 
 * To re-ingest a single document:
 *   reingestDocument('document-id-here')
 */

(async function reingestAllDocuments() {
  console.log('%c🔄 TAILOR Document Re-ingestion', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('Starting re-ingestion process...\n');

  try {
    // Step 1: Confirm before proceeding
    const proceed = confirm(
      `Re-ingest all completed documents?\n\n` +
      `This will:\n` +
      `• Re-process experiences, skills, education, and certifications\n` +
      `• Generate new embeddings for semantic search\n` +
      `• Update canonical profile data (merge duplicates)\n` +
      `• May take a few minutes depending on document count\n\n` +
      `Click OK to proceed, or Cancel to abort.`
    );

    if (!proceed) {
      console.log('%c❌ Re-ingestion cancelled by user.', 'color: #ef4444;');
      return { cancelled: true };
    }

    // Step 2: Trigger re-ingestion (API will fetch all documents server-side)
    console.log('%c🚀 Starting re-ingestion...', 'color: #22c55e; font-weight: bold;');
    console.log('📋 The API will fetch all your completed documents automatically.\n');
    
    const startTime = Date.now();
    const ingestResponse = await fetch('/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!ingestResponse.ok) {
      const errorData = await ingestResponse.json();
      throw new Error(`Ingestion failed: ${errorData.error || ingestResponse.statusText}`);
    }

    const result = await ingestResponse.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Step 3: Show results
    console.log('\n' + '═'.repeat(60));
    console.log('%c📊 RE-INGESTION RESULTS', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
    console.log('═'.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Successfully processed: ${result.succeeded || 0}`);
    console.log(`❌ Failed: ${result.failed || 0}`);
    console.log(`📄 Total documents: ${result.processed || 0}`);

    if (result.canonicalization) {
      console.log('\n%c🔄 CANONICALIZATION (Merged Duplicates):', 'color: #8b5cf6; font-weight: bold;');
      console.log(`   📋 Canonical Experiences: ${result.canonicalization.experiences}`);
      console.log(`   🎯 Canonical Skills: ${result.canonicalization.skills}`);
    }

    if (result.canonicalizationError) {
      console.log('\n%c⚠️  Canonicalization Error:', 'color: #f59e0b;', result.canonicalizationError);
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n%c⚠️  Ingestion Errors:', 'color: #f59e0b; font-weight: bold;');
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.fileName}: ${err.error}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('%c✨ Re-ingestion complete!', 'color: #22c55e; font-weight: bold; font-size: 14px;');
    console.log('💡 Tip: Refresh the page to see updated profile data.');
    if (result.canonicalization?.experiences > 0) {
      console.log('💡 Duplicate experiences have been merged!');
    }
    console.log('═'.repeat(60));

    return result;

  } catch (error) {
    console.error('\n%c❌ RE-INGESTION FAILED', 'color: #ef4444; font-weight: bold; font-size: 14px;');
    console.error('═'.repeat(60));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('═'.repeat(60));
    throw error;
  }
})();

// Helper function to re-ingest a single document by ID
window.reingestDocument = async function(documentId) {
  console.log(`🔄 Re-ingesting document: ${documentId}\n`);

  try {
    const response = await fetch(`/api/ingest?documentId=${documentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Success:', result.message);
    return result;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
};

