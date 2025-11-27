/**
 * Browser Console Script: Re-ingest Documents
 * 
 * Copy and paste this entire script into your browser console while on the TAILOR app.
 * It will re-process all your completed documents with the latest ingestion logic.
 * 
 * What gets re-ingested:
 *   - Experiences and bullets
 *   - Skills
 *   - Education (with start/end dates if available)
 *   - Certifications
 *   - Contact information (name, email, phone, linkedin, portfolio - NO address)
 * 
 * Usage:
 *   1. Open browser console (Cmd+Option+I on Mac)
 *   2. Make sure you're logged into TAILOR
 *   3. Paste this entire script and press Enter
 * 
 * To re-ingest a single document:
 *   reingestDocument('document-id-here')
 */

(async function reingestAllDocuments() {
  console.log('🔄 Starting document re-ingestion...\n');

  try {
    // Step 1: Confirm before proceeding
    const proceed = confirm(
      `Re-ingest all completed documents?\n\n` +
      `This will:\n` +
      `- Re-process experiences, skills, education, and certifications\n` +
      `- Update canonical profile data\n` +
      `- May take a few minutes\n\n` +
      `Click OK to proceed, or Cancel to abort.`
    );

    if (!proceed) {
      console.log('❌ Re-ingestion cancelled by user.');
      return;
    }

    // Step 2: Trigger re-ingestion (API will fetch all documents server-side)
    console.log('🚀 Starting re-ingestion...');
    console.log('📋 The API will fetch all your completed documents automatically.\n');
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
    
    // Step 3: Show results
    console.log('\n' + '='.repeat(60));
    console.log('📊 RE-INGESTION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${result.succeeded || 0}`);
    console.log(`❌ Failed: ${result.failed || 0}`);
    console.log(`📄 Total: ${result.processed || 0}`);

    if (result.canonicalization) {
      console.log('\n🔄 CANONICALIZATION (Merged Duplicates):');
      console.log(`   📋 Canonical Experiences: ${result.canonicalization.experiences}`);
      console.log(`   🎯 Canonical Skills: ${result.canonicalization.skills}`);
    }

    if (result.canonicalizationError) {
      console.log('\n⚠️  Canonicalization Error:', result.canonicalizationError);
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Ingestion Errors:');
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.fileName}: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Re-ingestion complete!');
    console.log('💡 Tip: Refresh the page to see updated profile data.');
    console.log('💡 Duplicate experiences should now be merged!');
    console.log('='.repeat(60));

    return result;

  } catch (error) {
    console.error('\n❌ RE-INGESTION FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('='.repeat(60));
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

