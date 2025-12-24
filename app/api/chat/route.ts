import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { genAI, embedText, GeminiFileReference } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';
import { checkPremiumAccess } from '@/lib/access-control';
import { getRelevantChunks, mapChunksToFileRefs } from '@/lib/chunking';
import { retrieveProfileForJob } from '@/lib/rag/retriever';
import { fetchStats } from '@/app/api/stats/route';

const isDev = process.env.NODE_ENV !== 'production';

// TAILOR Career Coach System Prompt
const TAILOR_SYSTEM_PROMPT = `You are TAILOR, an AI career coach with a warm, encouraging, and professional personality. Your name stands for "Tailored AI Leveraging Optimal Resumes" but you're much more than a resume tool—you're a trusted career mentor.

## Your Personality
- Warm and approachable, like a supportive mentor who genuinely cares
- Confident but not arrogant—you know your stuff but stay humble
- Encouraging and positive, especially when users doubt themselves  
- Direct and actionable—you give specific, practical advice
- Occasionally use light humor to keep things engaging
- Address users personally and remember context from the conversation

## Your Capabilities
You have access to the user's complete career profile including:
- Work experiences with detailed bullet points and achievements
- Skills (both hard and soft skills with proficiency levels)
- Education history
- Certifications
- Contact information

## What You Can Help With

### 1. Interview Preparation
- Generate tailored interview questions based on their target role
- Help craft STAR stories from their actual experiences
- Practice mock interviews with realistic scenarios
- Prepare for behavioral, technical, and situational questions
- Coach on salary negotiation tactics

### 2. Resume & Profile Analysis
- Analyze strengths and unique selling points
- Identify the most impactful accomplishments
- Find gaps or areas that need strengthening  
- Retrieve and discuss specific bullets from their experience
- Suggest improvements for specific sections

### 3. Career Strategy & Transitions
- Map career paths and progression options
- Plan transitions into new industries or roles
- Identify transferable skills for career pivots
- Suggest skills to develop for target roles
- Provide industry insights and market positioning

### 4. Confidence Building
- Address imposter syndrome with evidence from their achievements
- Reframe experiences to highlight value
- Build confidence for interviews and negotiations
- Help overcome career-related anxiety
- Celebrate wins and progress

### 5. Professional Development
- Recommend learning paths and skills to acquire
- Suggest certifications relevant to their goals
- Provide networking strategies
- Offer personal branding advice

## Response Guidelines
- Always ground your advice in their actual experience when relevant
- When discussing their background, reference specific details from their profile
- Be specific and actionable—avoid generic platitudes
- If asked about something not in their profile, ask clarifying questions
- For interview prep, tailor questions to their specific experience level and industry
- When they express doubt, counter with concrete evidence from their accomplishments
- Keep responses focused and well-structured with clear formatting
- Use bullet points and headers when listing multiple items
- End with a follow-up question or next step when appropriate

## Important Notes
- You are here to empower, not replace their judgment
- Acknowledge the emotional aspects of career challenges
- Be honest if something is outside your knowledge
- Respect confidentiality—their career information is private
- If they seem stressed or anxious, acknowledge those feelings first before diving into advice`;

// Build context string from profile data
function buildProfileContext(profile: any): string {
  const parts: string[] = [];

  if (profile.contactInfo?.name) {
    parts.push(`## User: ${profile.contactInfo.name}`);
  }

  if (profile.experiences?.length > 0) {
    parts.push('\n## Work Experience');
    for (const exp of profile.experiences) {
      parts.push(`\n### ${exp.title} at ${exp.company}`);
      if (exp.location) parts.push(`Location: ${exp.location}`);
      if (exp.startDate || exp.endDate) {
        parts.push(`Duration: ${exp.startDate || 'N/A'} - ${exp.isCurrent ? 'Present' : exp.endDate || 'N/A'}`);
      }
      if (exp.tenureMonths) parts.push(`Tenure: ${Math.round(exp.tenureMonths / 12 * 10) / 10} years`);

      if (exp.bullets?.length > 0) {
        parts.push('Key Accomplishments:');
        for (const bullet of exp.bullets.slice(0, 8)) {
          parts.push(`• ${bullet.text}`);
        }
      }
    }
  }

  if (profile.skills?.length > 0) {
    parts.push('\n## Skills');
    const skillsByCategory: Record<string, string[]> = {};
    for (const skill of profile.skills) {
      const category = skill.category || 'Other';
      if (!skillsByCategory[category]) skillsByCategory[category] = [];
      skillsByCategory[category].push(skill.canonicalName);
    }
    for (const [category, skills] of Object.entries(skillsByCategory)) {
      parts.push(`\n### ${category}`);
      parts.push(skills.join(', '));
    }
  }

  if (profile.education?.length > 0) {
    parts.push('\n## Education');
    for (const edu of profile.education) {
      const degree = edu.degree ? `${edu.degree}` : '';
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
      parts.push(`• ${degree}${field} from ${edu.institution}${edu.endDate ? ` (${edu.endDate})` : ''}`);
    }
  }

  if (profile.certifications?.length > 0) {
    parts.push('\n## Certifications');
    for (const cert of profile.certifications) {
      parts.push(`• ${cert.name}${cert.issuer ? ` - ${cert.issuer}` : ''}${cert.issueDate ? ` (${cert.issueDate})` : ''}`);
    }
  }

  return parts.join('\n');
}

export async function POST(request: NextRequest) {
  console.log('💬 TAILOR Coach API - POST request received');

  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 TAILOR Coach API - User authenticated:', userId ? '✅' : '❌');

    // 🔒 Check premium access (paywall enforcement)
    const accessResult = await checkPremiumAccess(userId);
    if (!accessResult.allowed) {
      console.log('🚫 Chat access blocked - free user:', userId);
      return NextResponse.json(
        {
          error: accessResult.reason,
          upgrade: true,
          feature: 'chat',
        },
        { status: 403 }
      );
    }
    console.log('✅ Chat access granted:', accessResult.reason);

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Handle slash commands
    if (message.trim().startsWith('/stats')) {
      console.log('📊 Slash command detected: /stats');

      try {
        const stats = await fetchStats(userId);

        // Format stats response
        const formattedResponse = `📊 **TAILOR Platform Statistics**

**Total Platform Stats:**
• 👥 Total Users: ${stats.total.users}
• 📄 Total Resumes Created: ${stats.total.resumes}
• 📁 Total Documents Uploaded: ${stats.total.documents}
• 💼 Total Jobs Added: ${stats.total.jobs}

**Your Stats:**
• 📄 Your Resumes: ${stats.user.resumes}
• 📁 Your Documents: ${stats.user.documents}
• 💼 Your Jobs: ${stats.user.jobs}

**Platform Averages:**
• Resumes per user: ${stats.averages.resumesPerUser}
• Documents per user: ${stats.averages.documentsPerUser}
• Jobs per user: ${stats.averages.jobsPerUser}

*Use \`/stats\` anytime to see updated statistics!*`;

        return NextResponse.json({ response: formattedResponse });
      } catch (error: any) {
        console.error('❌ Error handling /stats command:', error);
        return NextResponse.json({
          response: "I couldn't fetch the statistics right now. Please try again in a moment."
        });
      }
    }

    // Fetch comprehensive user profile
    const profile = await retrieveProfileForJob(userId, '');
    const profileContext = buildProfileContext(profile);

    console.log('📋 TAILOR Coach - Profile loaded:', {
      experiences: profile.experiences?.length || 0,
      skills: profile.skills?.length || 0,
      education: profile.education?.length || 0,
      certifications: profile.certifications?.length || 0,
      userName: profile.contactInfo?.name || 'Unknown',
    });

    // Fetch user documents for additional context
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('parse_status', 'completed');

    if (docsError) {
      console.error('Documents fetch error:', docsError);
    }

    // Get relevant chunks based on the query
    const { chunks: relevantChunks } = await getRelevantChunks(userId, message, 8);
    console.log('🔍 TAILOR Coach - Chunk hits:', relevantChunks.length);

    const chunkTexts = relevantChunks.map((chunk) => chunk.content);
    const chunkFileRefs = mapChunksToFileRefs(relevantChunks);

    // Collect file URIs for Gemini
    const documentFileRefs = documents
      ?.filter((doc: any) => doc.gemini_file_uri)
      .map((doc: any) => ({
        uri: doc.gemini_file_uri,
        mimeType: doc.file_type || 'application/octet-stream',
      })) || [];

    if (!genAI) {
      throw new Error('Gemini API not configured');
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    // Build conversation history
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Start chat with system instruction
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Initialize TAILOR Career Coach mode.' }],
        },
        {
          role: 'model',
          parts: [{ text: "I'm ready to help as TAILOR, your AI career coach! I have access to your complete profile and I'm here to support your career journey. What would you like to work on today?" }],
        },
        ...formattedHistory,
      ],
    });

    // Build the context-enriched message
    let contextEnrichedMessage = `${TAILOR_SYSTEM_PROMPT}

## User's Career Profile
${profileContext}`;

    // Add relevant document chunks if available
    if (chunkTexts.length > 0) {
      contextEnrichedMessage += `

## Additional Context from Documents
${chunkTexts.map((chunk, idx) => `Document Excerpt ${idx + 1}:\n${chunk}`).join('\n\n---\n\n')}`;
    }

    contextEnrichedMessage += `

---

## User's Question
${message}

---

Respond as TAILOR, the career coach. Be warm, specific, and actionable. Reference the user's actual experience when relevant.`;

    // Build message parts
    const parts: any[] = [{ text: contextEnrichedMessage }];

    // Add file references if available
    if (chunkFileRefs.length > 0) {
      for (const ref of chunkFileRefs) {
        if (ref.uri) {
          parts.push({
            fileData: {
              fileUri: ref.uri,
              mimeType: ref.mimeType,
            },
          });
        }
      }
    }

    if (documentFileRefs.length > 0) {
      for (const ref of documentFileRefs) {
        if (ref.uri) {
          parts.push({
            fileData: {
              fileUri: ref.uri,
              mimeType: ref.mimeType,
            },
          });
        }
      }
    }

    // Get response
    const result = await chat.sendMessage(parts);
    const response = result.response.text();

    console.log('✅ TAILOR Coach - Response generated, length:', response.length);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('❌ TAILOR Coach error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
