import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const { NextRequest } = await import('next/server');
  const { POST: generateResume } = await import('@/app/api/generate/route');

  const jobId = process.argv[2];
  if (!jobId) {
    console.error('Usage: npx tsx scripts/debug-generate.ts <jobId>');
    process.exit(1);
  }

  process.env.DEBUG_USER_ID = process.env.DEBUG_USER_ID || 'cd78e0f4-6563-4973-a88c-735c1e1d6a0b';

  const body = JSON.stringify({
    jobId,
    template: 'modern',
  });

  const request = new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const response = await generateResume(request);
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', data);
}

main().catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});

