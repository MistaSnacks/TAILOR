import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * POST /api/scrape
 * 
 * Scrapes a URL and returns the content as markdown.
 * Uses fetch with HTML-to-markdown conversion for public pages.
 * 
 * Note: LinkedIn profiles require authentication and may not work with simple scraping.
 * For production, consider using a dedicated scraping service like Firecrawl.
 */
export async function POST(request: NextRequest) {
  if (isDev) console.log('🔄 Scrape API - POST request received');

  try {
    await requireAuth();

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if it's a LinkedIn URL (these often require special handling)
    const isLinkedIn = parsedUrl.hostname.includes('linkedin.com');
    
    if (isLinkedIn) {
      console.log('⚠️ LinkedIn URL detected - may require authentication');
      // For LinkedIn, we'd ideally use their API or a service like Firecrawl
      // For now, we'll try to fetch but it may not work
    }

    console.log('🔍 Scraping URL:', url.substring(0, 50) + '...');

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error('❌ Fetch failed:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: 'Failed to fetch URL',
          status: response.status,
          statusText: response.statusText,
        },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Check if we got a login page (common for LinkedIn)
    if (isLinkedIn && (html.includes('authwall') || html.includes('login') || html.includes('sign-in'))) {
      console.log('⚠️ LinkedIn returned login page - profile may be private');
      return NextResponse.json(
        { 
          error: 'LinkedIn profile requires authentication or is private',
          suggestion: 'Please make your LinkedIn profile public, or use the manual paste option.',
        },
        { status: 403 }
      );
    }

    // Convert HTML to a simplified markdown-like format
    const markdown = htmlToSimpleMarkdown(html);

    if (!markdown || markdown.length < 100) {
      return NextResponse.json(
        { error: 'Unable to extract meaningful content from URL' },
        { status: 400 }
      );
    }

    console.log('✅ Scraped content:', {
      url: url.substring(0, 30) + '...',
      contentLength: markdown.length,
    });

    return NextResponse.json({
      success: true,
      url,
      markdown,
      contentLength: markdown.length,
    });

  } catch (error: any) {
    console.error('❌ Scrape API error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to scrape URL', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Convert HTML to a simplified markdown-like format
 * This extracts text content while preserving some structure
 */
function htmlToSimpleMarkdown(html: string): string {
  // Remove script and style tags completely
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Convert headers to markdown
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // Convert paragraphs and divs to new lines
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Convert lists
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // Convert links - preserve href
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)');

  // Convert strong/bold
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

  // Convert em/italic
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')  // Multiple spaces to single
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Multiple newlines to double
    .trim();

  return text;
}



