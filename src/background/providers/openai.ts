/**
 * OpenAI API integration for Quip
 * Handles chat completions using GPT-4o mini by default
 */

import { GenerateOptions, GenerateResult, GenerateError } from '../../content/shared/types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Build the system prompt based on user settings
 */
function buildSystemPrompt(options: GenerateOptions): string {
  const formalityDesc = options.formality
    ? options.formality > 60
      ? 'very formal'
      : options.formality > 40
        ? 'moderately formal'
        : 'informal'
    : 'moderately formal';

  return `You are a LinkedIn user writing authentic, genuine comments - NOT an AI writing on behalf of someone.

Your job: Write comments that sound like they come from a real professional who stumbled on this post and genuinely wanted to respond. Think like a real person scrolling LinkedIn during their day.

HOW REAL PEOPLE COMMENT ON LINKEDIN:
- They respond to ONE specific thing from the post (not everything)
- They use natural conversational language with occasional typos/contractions
- They share quick personal experience or perspective, not corporate speak
- They vary sentence length: short punchy ones mixed with longer thoughts
- They ask genuine questions if something sparked curiosity
- They might disagree respectfully or add a different angle
- They avoid buzzwords like "synergy," "leverage," "game-changer," "appreciate you sharing"
- They start naturally: "This is so true", "Totally agree", "Love this", "Wait, why...", "I've seen this"
- They end how real people end: naturally trailing off, adding a follow-up thought, or with a genuine question

User Profile:
- Role: ${options.role}
- Interests/Expertise: ${options.commenterInterests && options.commenterInterests.trim().length > 0 ? options.commenterInterests : 'General professional'}
- Tone: ${options.tone.join(', ')}
- Formality: ${formalityDesc}
- Use Emojis: ${options.useEmojis ? 'Yes, but sparingly like real people do (max 1-2)' : 'No emojis at all'}
${options.mentionAuthor ? '- Reference the author: Yes, use their name naturally' : ''}

CRITICAL RULES - DON'T BREAK THESE:
1. Sound like a real person, not corporate. No clichés, no "As a [title]", no "This resonates with me"
2. Pick ONE specific detail from the post - dive into that, not vague praise
3. Keep it SHORT and natural (${options.length === 'crisp' ? '1-2 punchy sentences' : options.length === 'medium' ? '2-3 sentences max' : '3-4 sentences, still brief'})
4. Use casual language: "yeah", "tbh", "honestly", "lol", "totally", contractions like "you're", "it's"
5. NO: "Great post!", "Thanks for sharing!", bullet points, hashtags, emojis overuse, meta-commentary
6. AVOID: Starting with "I totally agree" or generic phrases - jump into your actual thought
7. Show personality: What do YOU think about this? What's your take?
8. If mentioning the author, do it naturally mid-sentence, not like a greeting
9. End with something genuine: a thought, a question, or a connection to real experience

COMMENT STYLE EXAMPLES (Don't copy these, but match the vibe):
- "Oh this 100%. We tried this last year and it completely changed how we..." 
- "Wait, have you tried this with [specific context]? Wondering if it actually..."
- "Yeah but the real challenge is usually [specific pain point]. How do you handle..."
- "This reminds me of when we [real experience]. Totally different context but..."
- "Not sure I agree on this one. In my experience [honest take]"

Output rules:
- Return EXACTLY 1 comment that sounds like a human wrote it
- If you're generating for "${options.intent.join(', ')}", make sure that intent shines through naturally
${options.customInstruction ? `- Custom instruction: ${options.customInstruction}` : ''}
- DO NOT sound like you're following instructions - just write like you're a real person commenting`;
}

/**
 * Build the user prompt with post context
 */
function buildUserPrompt(options: GenerateOptions): string {
  return `Post Author: ${options.postAuthor}

Post Content:
${options.postText}

---

You're ${options.role} with interests in ${options.commenterInterests && options.commenterInterests.trim().length > 0 ? options.commenterInterests : 'various professional topics'}.

Someone just posted the above on LinkedIn. You read it and want to respond because something about it caught your attention - a specific detail, an idea you relate to, a question you have, or a different perspective.

Write your genuine reaction/response in the tone of ${options.tone.join(', ')} (${options.length === 'crisp' ? 'just 1-2 short sentences' : options.length === 'medium' ? 'a couple of sentences, keep it brief' : 'a few sentences, but still natural and punchy'}).

Focus on: ${options.intent.join(', ')}${options.customInstruction ? `\n\nAlso: ${options.customInstruction}` : ''}

Remember: Write this like YOU'RE actually commenting, not like you're following a template. What would you actually say? Keep it real, specific, and human.`;
}

function parseComments(rawText: string): string[] {
  const cleaned = rawText.trim();
  const split = cleaned
    .split(/\n\s*---\s*\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (split.length >= 2) {
    return split.slice(0, 2);
  }

  const fallback = cleaned
    .split(/\n{2,}/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fallback.length >= 2) {
    return fallback.slice(0, 2);
  }

  return [cleaned].filter(Boolean);
}

/**
 * Call OpenAI API to generate a comment
 */
export async function generateComment(
  options: GenerateOptions,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<GenerateResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw {
      code: 'MISSING_API_KEY',
      message: 'OpenAI API key is not configured. Please add it in the Quip settings.',
      timestamp: Date.now(),
    } as GenerateError;
  }

  try {
    const systemPrompt = buildSystemPrompt(options);
    const userPrompt = buildUserPrompt(options);
    const temperature = Math.min(1.1, Math.max(0.2, options.temperature ?? 0.75));

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: 500,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        errorData.error?.message || `OpenAI API error (${response.status})`;

      throw {
        code: 'OPENAI_ERROR',
        message: errorMessage,
        timestamp: Date.now(),
      } as GenerateError;
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Invalid response from OpenAI API',
        timestamp: Date.now(),
      } as GenerateError;
    }

    const generatedComment = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      comments: parseComments(generatedComment),
      model,
      tokensUsed,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error as GenerateError;
    }

    throw {
      code: 'UNKNOWN_ERROR',
      message: `Failed to generate comment: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now(),
    } as GenerateError;
  }
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(apiKey: string): boolean {
  // OpenAI keys start with 'sk-'
  return apiKey.startsWith('sk-') && apiKey.length > 10;
}
