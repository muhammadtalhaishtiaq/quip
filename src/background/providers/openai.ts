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

  return `You are a LinkedIn comment expert. Your job is to generate insightful, authentic comments for LinkedIn posts.

User Profile:
- Role: ${options.role}
- Tone: ${options.tone.join(', ')}
- Formality: ${formalityDesc}
- Use Emojis: ${options.useEmojis ? 'Yes, sparingly' : 'No'}
${options.mentionAuthor ? '- Mention the author by name when appropriate' : ''}

Guidelines:
1. Comments should feel authentic and human-written, not AI-generated
2. Keep comments concise but meaningful (${options.length === 'crisp' ? '1-2 sentences' : options.length === 'medium' ? '3-4 sentences' : '5+ sentences'})
3. Avoid generic praise or engagement-bait
4. Add genuine value or insight to the conversation
5. LinkedIn character limit is 3,000 chars - stay well within bounds
6. Avoid starting with "Great post!" or similar overused phrases
${options.mentionAuthor ? '7. Reference the author by name in your comment' : ''}

Output rules:
- Return EXACTLY 2 distinct comment options.
- Separate the two options using this delimiter on its own line: ---
- Return only the two comment options, with no numbering or commentary.

Intent: ${options.intent.join(', ')}`;
}

/**
 * Build the user prompt with post context
 */
function buildUserPrompt(options: GenerateOptions): string {
  return `Post Author: ${options.postAuthor}

Post Content:
${options.postText}

Post Excerpt/Summary:
${options.excerpt}

Generate a comment on this post that is ${options.tone.join('/')}, ${options.length === 'crisp' ? 'very brief' : options.length === 'medium' ? 'moderate length' : 'detailed'}, and focuses on ${options.intent.join(', ')}${options.customInstruction ? `. Additional instruction: ${options.customInstruction}` : ''}.

Return EXACTLY 2 options separated by a line containing only ---.
Do not number the options.
Do not use markdown, quotation marks, or meta-text.`;
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
        temperature: 0.7,
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
