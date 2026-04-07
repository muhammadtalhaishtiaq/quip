# QUIP — AI IDE Project Document
> Feed this entire document into your AI IDE (Cursor, Windsurf, Copilot Workspace, etc.) before writing any code. This is the single source of truth for the project.

---

## 1. What we are building

**Quip** is an open-source browser extension for Brave and Chrome that generates AI-powered comments on LinkedIn and X (Twitter). Users bring their own LLM API key (OpenAI, Anthropic Claude, or Google Gemini). There is no backend, no subscription, no quota, and no data ever sent to any third-party server other than the user's chosen LLM provider.

The extension activates only when the user clicks the Comment button on a LinkedIn post or the Reply button on a tweet. A lightweight panel appears inline, below that specific post, in a fully isolated Shadow DOM. The user picks tone, length, and wit level, clicks Generate, and gets a comment they can copy or inject directly into the text box. When they click elsewhere, the panel is destroyed entirely. The next post they click starts completely fresh with no state carried over.

This is the core product philosophy: **zero performance cost when idle, zero state leakage between posts, zero servers**.

---

## 2. What problem this solves

CommentRocket is the main competitor ($19/month, 5,000 comment cap). It has two critical flaws:

1. It injects a persistent React sidebar into the LinkedIn DOM and runs a `MutationObserver` on `document.body` with `subtree: true`. This fires on every single DOM mutation across the entire LinkedIn page (LinkedIn is a heavy SPA that generates hundreds of mutations per scroll). The result is significant scroll jank and ~200MB extra RAM usage reported by users.

2. It sends user LinkedIn session data and post content through their own servers, creating a privacy risk and a cost gate.

Quip fixes both. It is the fast, private, open-source version.

---

## 3. Tech stack — do not deviate from this

| Layer | Technology | Reason |
|---|---|---|
| Language | TypeScript (strict mode) | Type safety, IDE support |
| Build tool | Vite + @crxjs/vite-plugin | Hot reload in extension dev, clean MV3 output |
| UI framework | **None** — vanilla TypeScript DOM | Lightest possible content script footprint |
| Extension standard | Manifest V3 | Required for Chrome Web Store, works on Brave |
| Styling in panel | CSS-in-JS string injected into Shadow DOM | Isolation from host page CSS |
| LLM calls | Fetch API from service worker | Content scripts cannot set Authorization headers reliably |
| Key storage | `chrome.storage.local` | Never leaves the device |
| Node version | 20+ | Required by Vite 5 |
| Package manager | npm | Keep it simple |

**Do not add React, Vue, Svelte, Preact, or any component framework.** The content script must be under 15KB total. Every KB costs scroll performance.

---

## 4. Repository structure

Create this exact structure. Every file listed here must be created.

```
quip/
│
├── manifest.json                     ← MV3 manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
│
├── src/
│   │
│   ├── content/                      ← Injected into LinkedIn / X tabs
│   │   ├── linkedin.ts               ← LinkedIn entry point
│   │   ├── twitter.ts                ← X/Twitter entry point
│   │   │
│   │   └── shared/
│   │       ├── types.ts              ← All shared TypeScript types
│   │       ├── selectors.ts          ← All DOM selectors in one place
│   │       ├── extractor.ts          ← Pulls post text from DOM
│   │       ├── panel.ts             ← Shadow DOM panel — the entire UI
│   │       └── llm.ts               ← Prompt builder + shared prompt logic
│   │
│   ├── background/
│   │   ├── service-worker.ts         ← Message handler + LLM API calls
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── claude.ts
│   │       └── gemini.ts
│   │
│   └── popup/
│       ├── popup.html                ← Settings page (API keys, model, defaults)
│       ├── popup.ts
│       └── popup.css
│
└── public/
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

---

## 5. manifest.json — exact content

```json
{
  "manifest_version": 3,
  "name": "Quip",
  "version": "1.0.0",
  "description": "AI comment generator for LinkedIn & X. Bring your own API key. Open source.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://x.com/*",
    "https://twitter.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*",
    "https://generativelanguage.googleapis.com/*"
  ],
  "background": {
    "service_worker": "dist/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["dist/linkedin.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://x.com/*", "https://twitter.com/*"],
      "js": ["dist/twitter.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png"
    }
  },
  "icons": {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
}
```

**Do not add the `scripting` permission.** It is not needed and increases the perceived risk surface during Web Store review.

---

## 6. package.json

```json
{
  "name": "quip",
  "version": "1.0.0",
  "description": "AI comment generator for LinkedIn & X. BYOK. Open source.",
  "private": true,
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "zip": "npm run build && cd dist && zip -r ../quip-release.zip . && cd ..",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.23",
    "@types/chrome": "^0.0.270",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

---

## 7. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2022", "DOM"],
    "types": ["chrome"],
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*", "manifest.json"]
}
```

---

## 8. vite.config.ts

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
  },
});
```

---

## 9. src/content/shared/types.ts

```typescript
export type Provider = 'openai' | 'claude' | 'gemini';

export type Tone = 'professional' | 'friendly' | 'casual' | 'witty';
export type Length = 'crisp' | 'medium' | 'long';
export type WitLevel = 'subtle' | 'playful' | 'bold';
export type Platform = 'linkedin' | 'twitter';

export interface ExtraFlags {
  humanize: boolean;
  disagree: boolean;
  addQuestion: boolean;
  addAnecdote: boolean;
}

export interface GenerateOptions {
  postText: string;
  tone: Tone;
  length: Length;
  witLevel: WitLevel;
  extraFlags: ExtraFlags;
}

export interface StoredSettings {
  provider: Provider;
  openaiKey?: string;
  claudeKey?: string;
  geminiKey?: string;
  openaiModel?: string;
  claudeModel?: string;
  geminiModel?: string;
  defaultTone?: Tone;
  defaultLength?: Length;
  defaultWitLevel?: WitLevel;
}

export interface GenerateResult {
  text: string;
  provider: Provider;
}

export interface GenerateError {
  error: string;
}

// Message types between content script ↔ service worker
export interface GenerateMessage {
  type: 'GENERATE';
  options: GenerateOptions;
}

export type WorkerResponse = GenerateResult | GenerateError;
```

---

## 10. src/content/shared/selectors.ts

These are LinkedIn and X DOM selectors. They change occasionally. Keep them all in this one file so updates are a single-file change.

```typescript
export const LINKEDIN = {
  // The infinite scroll feed container — observe ONLY this, not document.body
  feed: '.scaffold-finite-scroll__content',

  // A post article — multiple selectors in priority order
  postArticle: [
    '[data-id]',
    '.feed-shared-update-v2',
    'article.feed-shared-update-v2',
  ] as string[],

  // The text content of a post
  postText: [
    '.feed-shared-update-v2__description',
    '.feed-shared-text',
    '.update-components-text',
    '[data-test-id="main-feed-activity-card__commentary"]',
  ] as string[],

  // The "Comment" button on a post
  commentButton: '[aria-label="Comment"]',

  // The comment input area that appears after clicking Comment
  commentBox: [
    '.comments-comment-box',
    '.comments-comment-texteditor',
  ] as string[],

  // The actual editable element inside the comment box
  commentEditor: [
    '.ql-editor',
    '.comments-comment-texteditor__content',
    '[contenteditable="true"]',
  ] as string[],
} as const;

export const TWITTER = {
  // The main feed column — observe only this
  timeline: '[data-testid="primaryColumn"]',

  // A tweet article
  tweetArticle: 'article[data-testid="tweet"]',

  // The text content of a tweet
  tweetText: '[data-testid="tweetText"]',

  // The reply button on a tweet
  replyButton: '[data-testid="reply"]',

  // The textarea in the reply modal
  replyTextarea: '[data-testid="tweetTextarea_0"]',
} as const;
```

---

## 11. src/content/shared/extractor.ts

```typescript
import { LINKEDIN, TWITTER } from './selectors';

export function extractLinkedInPost(postEl: HTMLElement): string {
  for (const selector of LINKEDIN.postText) {
    const el = postEl.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 10) {
      return text.slice(0, 2000);
    }
  }
  // Last resort: innerText of entire article (includes some UI noise but better than nothing)
  return postEl.innerText.trim().slice(0, 2000);
}

export function extractTweet(articleEl: HTMLElement): string {
  const tweetTextEl = articleEl.querySelector(TWITTER.tweetText);
  const text = tweetTextEl?.textContent?.trim();
  if (text && text.length > 3) {
    return text.slice(0, 1000);
  }
  return articleEl.innerText.trim().slice(0, 1000);
}

export function findPostAncestor(el: HTMLElement): HTMLElement | null {
  for (const selector of LINKEDIN.postArticle) {
    const post = el.closest(selector) as HTMLElement | null;
    if (post) return post;
  }
  return null;
}

export function findCommentBox(postEl: HTMLElement): HTMLElement | null {
  // Comment box only appears in DOM after user clicks the Comment button
  // Try each selector with a small retry since LinkedIn renders it asynchronously
  for (const selector of LINKEDIN.commentBox) {
    const el = postEl.querySelector(selector) as HTMLElement | null;
    if (el) return el;
  }
  return null;
}
```

---

## 12. src/content/shared/llm.ts

```typescript
import type { GenerateOptions, Tone, Length, WitLevel } from './types';

export const SYSTEM_PROMPT = `You are a professional social media comment writer.
Your job is to write a single comment in response to a post.

Rules:
- Output ONLY the comment text. No preamble, no explanation, no quotes around the comment.
- Do NOT start with "Great post!", "Excellent point!", "Thanks for sharing", or any similar hollow opener.
- Sound like a real human professional, not an AI assistant.
- Match the tone and length instructions exactly.
- If asked to disagree, do so respectfully but clearly.
- If asked to add a question, make it genuinely curious and specific to the post content.`;

export function buildPrompt(options: GenerateOptions): string {
  const { postText, tone, length, witLevel, extraFlags } = options;

  const lengthGuide: Record<Length, string> = {
    crisp: '1 to 2 sentences maximum',
    medium: '2 to 4 sentences',
    long: '4 to 6 sentences with some depth',
  };

  const toneGuide: Record<Tone, string> = {
    professional: 'professional and authoritative',
    friendly: 'warm, approachable, and genuine',
    casual: 'relaxed and conversational, like texting a colleague',
    witty: 'clever, slightly humorous, with a light touch',
  };

  const witGuide: Record<WitLevel, string> = {
    subtle: 'understated — no jokes, just smart phrasing',
    playful: 'lightly playful — a hint of personality',
    bold: 'confidently witty — memorable and distinctive',
  };

  const flags: string[] = [];
  if (extraFlags.humanize) flags.push('make it sound unmistakably human — use natural phrasing, minor imperfections, and specific language');
  if (extraFlags.disagree) flags.push('respectfully but clearly challenge or disagree with the main point of the post');
  if (extraFlags.addQuestion) flags.push('end with one thoughtful question that is specific to the post content');
  if (extraFlags.addAnecdote) flags.push('weave in a brief personal-sounding anecdote or observation');

  return `Post to comment on:
"""
${postText}
"""

Write a comment with these parameters:
- Tone: ${toneGuide[tone]}
- Length: ${lengthGuide[length]}
- Wit level: ${witGuide[witLevel]}
${flags.length > 0 ? `- Additional requirements: ${flags.join('; ')}` : ''}

Reply with only the comment text, nothing else.`;
}
```

---

## 13. src/background/providers/openai.ts

```typescript
import { buildPrompt, SYSTEM_PROMPT } from '../../content/shared/llm';
import type { GenerateOptions, GenerateResult } from '../../content/shared/types';

export async function generate(
  apiKey: string,
  model: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 350,
      temperature: 0.8,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(options) },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${response.status}: ${err?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned an empty response.');

  return { text, provider: 'openai' };
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini — fast & cheap (recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o — best quality' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo — cheapest' },
];
```

---

## 14. src/background/providers/claude.ts

```typescript
import { buildPrompt, SYSTEM_PROMPT } from '../../content/shared/llm';
import type { GenerateOptions, GenerateResult } from '../../content/shared/types';

export async function generate(
  apiKey: string,
  model: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 350,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildPrompt(options) },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${err?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text?.trim();
  if (!text) throw new Error('Claude returned an empty response.');

  return { text, provider: 'claude' };
}

export const CLAUDE_MODELS = [
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku — fast (recommended)' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet — best quality' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus — most capable' },
];
```

---

## 15. src/background/providers/gemini.ts

```typescript
import { buildPrompt, SYSTEM_PROMPT } from '../../content/shared/llm';
import type { GenerateOptions, GenerateResult } from '../../content/shared/types';

export async function generate(
  apiKey: string,
  model: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n${buildPrompt(options)}` },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 350,
        temperature: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${err?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned an empty response.');

  return { text, provider: 'gemini' };
}

export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — fast (recommended)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — best quality' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — fast & cheap' },
];
```

---

## 16. src/background/service-worker.ts

```typescript
import type {
  GenerateMessage,
  WorkerResponse,
  StoredSettings,
} from '../content/shared/types';

chrome.runtime.onMessage.addListener(
  (message: GenerateMessage, _sender, sendResponse) => {
    if (message.type !== 'GENERATE') return false;

    handleGenerate(message)
      .then((result) => sendResponse(result))
      .catch((err: Error) => sendResponse({ error: err.message }));

    // Return true to keep the message channel open for async response
    return true;
  }
);

async function handleGenerate(message: GenerateMessage): Promise<WorkerResponse> {
  const settings = await getStoredSettings();

  if (!settings) {
    throw new Error('No API key found. Click the Quip icon in your toolbar to set up your API key.');
  }

  const { provider } = settings;

  switch (provider) {
    case 'openai': {
      if (!settings.openaiKey) throw new Error('OpenAI API key is not set.');
      const { generate } = await import('./providers/openai');
      return generate(
        settings.openaiKey,
        settings.openaiModel ?? 'gpt-4o-mini',
        message.options
      );
    }
    case 'claude': {
      if (!settings.claudeKey) throw new Error('Anthropic API key is not set.');
      const { generate } = await import('./providers/claude');
      return generate(
        settings.claudeKey,
        settings.claudeModel ?? 'claude-3-5-haiku-20241022',
        message.options
      );
    }
    case 'gemini': {
      if (!settings.geminiKey) throw new Error('Gemini API key is not set.');
      const { generate } = await import('./providers/gemini');
      return generate(
        settings.geminiKey,
        settings.geminiModel ?? 'gemini-2.0-flash',
        message.options
      );
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function getStoredSettings(): Promise<StoredSettings | null> {
  const result = await chrome.storage.local.get('quip_settings');
  return (result['quip_settings'] as StoredSettings) ?? null;
}
```

---

## 17. src/content/shared/panel.ts

This is the entire Quip UI. It is a Shadow DOM component — no framework, no imports from React or similar. It must stay framework-free. The CSS is scoped inside the shadow root and cannot affect LinkedIn or X styling.

```typescript
import type {
  Tone, Length, WitLevel, ExtraFlags,
  GenerateOptions, GenerateResult, GenerateError, Platform,
} from './types';

// ─── Panel State ────────────────────────────────────────────────────────────

interface PanelState {
  tone: Tone;
  length: Length;
  witLevel: WitLevel;
  extraFlags: ExtraFlags;
  isLoading: boolean;
  result: string;
  error: string;
  copied: boolean;
}

// ─── Mount ──────────────────────────────────────────────────────────────────

export function mountPanel(
  anchor: HTMLElement,
  postText: string,
  platform: Platform
): HTMLElement {
  const host = document.createElement('div');
  host.setAttribute('id', 'quip-panel-host');
  host.style.cssText = 'display:block;width:100%;margin:8px 0;z-index:9999;';

  const shadow = host.attachShadow({ mode: 'closed' });

  const state: PanelState = {
    tone: 'professional',
    length: 'medium',
    witLevel: 'subtle',
    extraFlags: { humanize: false, disagree: false, addQuestion: false, addAnecdote: false },
    isLoading: false,
    result: '',
    error: '',
    copied: false,
  };

  // Inject styles into shadow root
  const styleEl = document.createElement('style');
  styleEl.textContent = PANEL_CSS;
  shadow.appendChild(styleEl);

  // Render container
  const container = document.createElement('div');
  container.className = 'quip';
  shadow.appendChild(container);

  function render() {
    container.innerHTML = buildHTML(state);
    bindEvents(container, state, postText, platform, render);
  }

  // Insert panel after the anchor element
  anchor.insertAdjacentElement('afterend', host);
  render();

  return host;
}

export function unmountPanel(host: HTMLElement): void {
  host.remove();
}

// ─── HTML Builder ────────────────────────────────────────────────────────────

function buildHTML(state: PanelState): string {
  const tones: Tone[] = ['professional', 'friendly', 'casual', 'witty'];
  const lengths: Length[] = ['crisp', 'medium', 'long'];
  const wits: WitLevel[] = ['subtle', 'playful', 'bold'];

  const pill = (label: string, active: boolean, attr: string, val: string) =>
    `<span class="pill${active ? ' active' : ''}" data-${attr}="${val}">${label}</span>`;

  const flag = (label: string, active: boolean, id: string) =>
    `<span class="flag${active ? ' active' : ''}" id="${id}">${label}</span>`;

  return `
    <div class="quip-header">
      <span class="quip-logo">Quip</span>
      <button class="close-btn" id="quip-close" aria-label="Close Quip">×</button>
    </div>

    <div class="section-label">Tone</div>
    <div class="row">
      ${tones.map(t => pill(t, state.tone === t, 'tone', t)).join('')}
    </div>

    <div class="section-label">Length</div>
    <div class="row">
      ${lengths.map(l => pill(l, state.length === l, 'length', l)).join('')}
    </div>

    <div class="section-label">Wit</div>
    <div class="row">
      ${wits.map(w => pill(w, state.witLevel === w, 'wit', w)).join('')}
    </div>

    <div class="row flags-row">
      ${flag('Humanize', state.extraFlags.humanize, 'flag-humanize')}
      ${flag('Disagree', state.extraFlags.disagree, 'flag-disagree')}
      ${flag('Add question', state.extraFlags.addQuestion, 'flag-question')}
      ${flag('Anecdote', state.extraFlags.addAnecdote, 'flag-anecdote')}
    </div>

    <button class="generate-btn" id="generate-btn" ${state.isLoading ? 'disabled' : ''}>
      ${state.isLoading ? 'Generating…' : 'Generate comment'}
    </button>

    ${state.isLoading ? `<div class="loading-hint">Asking your AI…</div>` : ''}

    ${state.result ? `
      <div class="result" id="result-text">${escapeHtml(state.result)}</div>
      <div class="result-actions">
        <button class="action-btn copy-btn" id="copy-btn">
          ${state.copied ? 'Copied!' : 'Copy'}
        </button>
        <button class="action-btn inject-btn" id="inject-btn">Insert into box</button>
        <button class="action-btn regen-btn" id="regen-btn">Regenerate</button>
      </div>
    ` : ''}

    ${state.error ? `<div class="error-box">${escapeHtml(state.error)}</div>` : ''}
  `;
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindEvents(
  container: HTMLElement,
  state: PanelState,
  postText: string,
  platform: Platform,
  render: () => void
): void {
  // Close button
  container.querySelector('#quip-close')?.addEventListener('click', () => {
    const host = container.getRootNode() as ShadowRoot;
    (host.host as HTMLElement).remove();
  });

  // Tone pills
  container.querySelectorAll<HTMLElement>('[data-tone]').forEach(el => {
    el.addEventListener('click', () => {
      state.tone = el.dataset['tone'] as Tone;
      render();
    });
  });

  // Length pills
  container.querySelectorAll<HTMLElement>('[data-length]').forEach(el => {
    el.addEventListener('click', () => {
      state.length = el.dataset['length'] as Length;
      render();
    });
  });

  // Wit pills
  container.querySelectorAll<HTMLElement>('[data-wit]').forEach(el => {
    el.addEventListener('click', () => {
      state.witLevel = el.dataset['wit'] as WitLevel;
      render();
    });
  });

  // Flag toggles
  const flagMap: Record<string, keyof ExtraFlags> = {
    'flag-humanize': 'humanize',
    'flag-disagree': 'disagree',
    'flag-question': 'addQuestion',
    'flag-anecdote': 'addAnecdote',
  };
  Object.entries(flagMap).forEach(([id, key]) => {
    container.querySelector(`#${id}`)?.addEventListener('click', () => {
      state.extraFlags[key] = !state.extraFlags[key];
      render();
    });
  });

  // Generate button
  container.querySelector('#generate-btn')?.addEventListener('click', () => {
    triggerGenerate(state, postText, render);
  });

  // Regenerate button
  container.querySelector('#regen-btn')?.addEventListener('click', () => {
    state.result = '';
    triggerGenerate(state, postText, render);
  });

  // Copy button
  container.querySelector('#copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(state.result).then(() => {
      state.copied = true;
      render();
      setTimeout(() => { state.copied = false; render(); }, 1800);
    });
  });

  // Insert into comment box
  container.querySelector('#inject-btn')?.addEventListener('click', () => {
    injectIntoCommentBox(state.result, platform);
  });
}

// ─── Generate Logic ───────────────────────────────────────────────────────────

async function triggerGenerate(
  state: PanelState,
  postText: string,
  render: () => void
): Promise<void> {
  state.isLoading = true;
  state.error = '';
  state.result = '';
  render();

  const options: GenerateOptions = {
    postText,
    tone: state.tone,
    length: state.length,
    witLevel: state.witLevel,
    extraFlags: { ...state.extraFlags },
  };

  const response = await chrome.runtime.sendMessage({
    type: 'GENERATE',
    options,
  }) as GenerateResult | GenerateError;

  state.isLoading = false;

  if ('error' in response) {
    state.error = response.error;
  } else {
    state.result = response.text;
  }

  render();
}

// ─── Inject into host page ────────────────────────────────────────────────────

function injectIntoCommentBox(text: string, platform: Platform): void {
  let editor: HTMLElement | null = null;

  if (platform === 'linkedin') {
    editor = document.querySelector('.ql-editor') as HTMLElement
      ?? document.querySelector('[contenteditable="true"].comments-comment-texteditor__content') as HTMLElement;
  } else {
    editor = document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement;
  }

  if (!editor) {
    alert('Could not find the comment box. Please click inside it first, then try Insert again.');
    return;
  }

  editor.focus();
  // execCommand is deprecated but still the only reliable cross-site method
  // for injecting text into contenteditable elements that use their own input handlers
  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, text);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// ─── Panel CSS (scoped inside Shadow DOM) ────────────────────────────────────

const PANEL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .quip {
    background: #ffffff;
    border: 1.5px solid #e2e2e2;
    border-radius: 12px;
    padding: 14px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }

  .quip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .quip-logo {
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.4px;
    color: #5b4fcf;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    line-height: 1;
    color: #999;
    cursor: pointer;
    padding: 0 2px;
    transition: color 0.15s;
  }
  .close-btn:hover { color: #333; }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 5px;
    margin-top: 10px;
  }
  .section-label:first-of-type { margin-top: 0; }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 4px;
  }

  .flags-row { margin-top: 10px; }

  .pill {
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1.5px solid #e0e0e0;
    background: #f9f9f9;
    font-size: 12px;
    color: #444;
    transition: all 0.15s;
    user-select: none;
  }
  .pill:hover { border-color: #c0b4f5; background: #f3f0ff; }
  .pill.active {
    background: #ede9fe;
    border-color: #a89cf5;
    color: #4a3eb8;
    font-weight: 600;
  }

  .flag {
    cursor: pointer;
    padding: 3px 10px;
    border-radius: 5px;
    border: 1.5px solid #e0e0e0;
    background: #f9f9f9;
    font-size: 11.5px;
    color: #555;
    transition: all 0.15s;
    user-select: none;
  }
  .flag:hover { border-color: #6ee7b7; background: #f0fdf4; }
  .flag.active {
    background: #ecfdf5;
    border-color: #6ee7b7;
    color: #065f46;
    font-weight: 600;
  }

  .generate-btn {
    width: 100%;
    margin-top: 12px;
    padding: 10px;
    background: #5b4fcf;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    letter-spacing: 0.01em;
  }
  .generate-btn:hover:not(:disabled) { background: #4a3eb8; }
  .generate-btn:disabled { background: #b0a8e8; cursor: not-allowed; }

  .loading-hint {
    text-align: center;
    font-size: 12px;
    color: #999;
    margin-top: 8px;
    font-style: italic;
  }

  .result {
    margin-top: 12px;
    padding: 12px;
    background: #f8f7ff;
    border: 1px solid #e6e1ff;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a1a;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .result-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .action-btn {
    flex: 1;
    padding: 7px 6px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1.5px solid #e0e0e0;
    background: #fff;
    color: #333;
  }
  .action-btn:hover { border-color: #a89cf5; background: #f3f0ff; color: #4a3eb8; }

  .inject-btn {
    background: #5b4fcf;
    color: #fff;
    border-color: #5b4fcf;
  }
  .inject-btn:hover { background: #4a3eb8; border-color: #4a3eb8; color: #fff; }

  .error-box {
    margin-top: 10px;
    padding: 10px 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    font-size: 12px;
    color: #b91c1c;
    line-height: 1.5;
  }

  @media (prefers-color-scheme: dark) {
    .quip { background: #1c1c2e; border-color: #3a3a5c; color: #e4e4f0; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
    .quip-logo { color: #a89cf5; }
    .close-btn { color: #666; }
    .close-btn:hover { color: #ccc; }
    .section-label { color: #666; }
    .pill { background: #252540; border-color: #3a3a5c; color: #bbb; }
    .pill:hover { background: #2e2a50; border-color: #7c6fe0; }
    .pill.active { background: #312a6e; border-color: #7c6fe0; color: #c4b9ff; }
    .flag { background: #252540; border-color: #3a3a5c; color: #bbb; }
    .flag.active { background: #0f3028; border-color: #065f46; color: #6ee7b7; }
    .result { background: #252540; border-color: #3a3a5c; color: #e4e4f0; }
    .action-btn { background: #252540; border-color: #3a3a5c; color: #bbb; }
    .action-btn:hover { border-color: #7c6fe0; background: #2e2a50; color: #c4b9ff; }
    .inject-btn { background: #4a3eb8; border-color: #4a3eb8; color: #fff; }
    .inject-btn:hover { background: #5b4fcf; border-color: #5b4fcf; }
    .error-box { background: #2d1010; border-color: #7f1d1d; color: #fca5a5; }
  }
`;
```

---

## 18. src/content/linkedin.ts

```typescript
import { findPostAncestor, findCommentBox, extractLinkedInPost } from './shared/extractor';
import { mountPanel, unmountPanel } from './shared/panel';
import { LINKEDIN } from './shared/selectors';

let activeHost: HTMLElement | null = null;

function onCommentClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const commentBtn = target.closest(LINKEDIN.commentButton) as HTMLElement | null;
  if (!commentBtn) return;

  // Destroy previous panel immediately — fresh state each time
  if (activeHost) {
    unmountPanel(activeHost);
    activeHost = null;
  }

  const post = findPostAncestor(commentBtn);
  if (!post) return;

  const postText = extractLinkedInPost(post);
  if (!postText || postText.length < 5) return;

  // LinkedIn renders the comment box asynchronously after the button click
  // Wait a short time for it to appear in the DOM
  setTimeout(() => {
    const commentBox = findCommentBox(post);
    if (!commentBox) return;

    activeHost = mountPanel(commentBox, postText, 'linkedin');
  }, 400);
}

function onOutsideClick(e: MouseEvent): void {
  if (!activeHost) return;
  const target = e.target as HTMLElement;

  // Keep panel open if user clicked inside it or on the comment button
  if (activeHost.contains(target)) return;
  if (target.closest(LINKEDIN.commentButton)) return;

  unmountPanel(activeHost);
  activeHost = null;
}

document.addEventListener('click', onCommentClick, { capture: false });
document.addEventListener('click', onOutsideClick, { capture: false });
```

---

## 19. src/content/twitter.ts

```typescript
import { extractTweet } from './shared/extractor';
import { mountPanel, unmountPanel } from './shared/panel';
import { TWITTER } from './shared/selectors';

let activeHost: HTMLElement | null = null;

function onReplyClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const replyBtn = target.closest(TWITTER.replyButton) as HTMLElement | null;
  if (!replyBtn) return;

  if (activeHost) {
    unmountPanel(activeHost);
    activeHost = null;
  }

  const tweet = replyBtn.closest(TWITTER.tweetArticle) as HTMLElement | null;
  if (!tweet) return;

  const postText = extractTweet(tweet);
  if (!postText || postText.length < 3) return;

  // Inject panel below the reply button's parent row
  const anchorEl = (replyBtn.parentElement ?? replyBtn) as HTMLElement;
  activeHost = mountPanel(anchorEl, postText, 'twitter');
}

function onOutsideClick(e: MouseEvent): void {
  if (!activeHost) return;
  const target = e.target as HTMLElement;
  if (activeHost.contains(target)) return;
  if (target.closest(TWITTER.replyButton)) return;

  unmountPanel(activeHost);
  activeHost = null;
}

document.addEventListener('click', onReplyClick, { capture: false });
document.addEventListener('click', onOutsideClick, { capture: false });
```

---

## 20. src/popup/popup.ts

```typescript
import type { StoredSettings, Provider, Tone, Length, WitLevel } from '../content/shared/types';
import { OPENAI_MODELS } from '../background/providers/openai';
import { CLAUDE_MODELS } from '../background/providers/claude';
import { GEMINI_MODELS } from '../background/providers/gemini';

const providerSelect = document.getElementById('provider') as HTMLSelectElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

const sections: Record<Provider, HTMLElement> = {
  openai: document.getElementById('openai-section') as HTMLElement,
  claude: document.getElementById('claude-section') as HTMLElement,
  gemini: document.getElementById('gemini-section') as HTMLElement,
};

function showSection(provider: Provider): void {
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== provider);
  });
}

async function loadSettings(): Promise<void> {
  const result = await chrome.storage.local.get('quip_settings');
  const settings: StoredSettings | undefined = result['quip_settings'];
  if (!settings) return;

  providerSelect.value = settings.provider;
  showSection(settings.provider);

  if (settings.openaiKey) (document.getElementById('openai-key') as HTMLInputElement).value = settings.openaiKey;
  if (settings.claudeKey) (document.getElementById('claude-key') as HTMLInputElement).value = settings.claudeKey;
  if (settings.geminiKey) (document.getElementById('gemini-key') as HTMLInputElement).value = settings.geminiKey;
  if (settings.openaiModel) (document.getElementById('openai-model') as HTMLSelectElement).value = settings.openaiModel;
  if (settings.claudeModel) (document.getElementById('claude-model') as HTMLSelectElement).value = settings.claudeModel;
  if (settings.geminiModel) (document.getElementById('gemini-model') as HTMLSelectElement).value = settings.geminiModel;
}

async function saveSettings(): Promise<void> {
  const provider = providerSelect.value as Provider;

  const settings: StoredSettings = {
    provider,
    openaiKey: (document.getElementById('openai-key') as HTMLInputElement).value.trim() || undefined,
    claudeKey: (document.getElementById('claude-key') as HTMLInputElement).value.trim() || undefined,
    geminiKey: (document.getElementById('gemini-key') as HTMLInputElement).value.trim() || undefined,
    openaiModel: (document.getElementById('openai-model') as HTMLSelectElement).value,
    claudeModel: (document.getElementById('claude-model') as HTMLSelectElement).value,
    geminiModel: (document.getElementById('gemini-model') as HTMLSelectElement).value,
  };

  // Validate: selected provider must have a key
  const keyMap: Record<Provider, string | undefined> = {
    openai: settings.openaiKey,
    claude: settings.claudeKey,
    gemini: settings.geminiKey,
  };
  if (!keyMap[provider]) {
    showStatus(`Please enter your ${provider} API key.`, 'error');
    return;
  }

  await chrome.storage.local.set({ quip_settings: settings });
  showStatus('Saved!', 'success');
}

function showStatus(msg: string, type: 'success' | 'error'): void {
  statusEl.textContent = msg;
  statusEl.className = type;
  setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 2500);
}

// Events
providerSelect.addEventListener('change', () => showSection(providerSelect.value as Provider));
saveBtn.addEventListener('click', saveSettings);

// Init
loadSettings();
showSection((providerSelect.value as Provider) || 'openai');
```

---

## 21. src/popup/popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quip Settings</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>

  <div class="header">
    <span class="logo">Quip</span>
    <span class="tagline">AI comments · BYOK · Open source</span>
  </div>

  <div class="form">

    <div class="field">
      <label for="provider">AI Provider</label>
      <select id="provider">
        <option value="openai">OpenAI</option>
        <option value="claude">Anthropic Claude</option>
        <option value="gemini">Google Gemini</option>
      </select>
    </div>

    <!-- OpenAI -->
    <div id="openai-section" class="provider-section">
      <div class="field">
        <label for="openai-key">OpenAI API key</label>
        <input type="password" id="openai-key" placeholder="sk-..." autocomplete="off">
        <a class="key-link" href="https://platform.openai.com/api-keys" target="_blank">Get API key →</a>
      </div>
      <div class="field">
        <label for="openai-model">Model</label>
        <select id="openai-model">
          <option value="gpt-4o-mini">GPT-4o mini — fast & cheap (recommended)</option>
          <option value="gpt-4o">GPT-4o — best quality</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo — cheapest</option>
        </select>
      </div>
    </div>

    <!-- Claude -->
    <div id="claude-section" class="provider-section hidden">
      <div class="field">
        <label for="claude-key">Anthropic API key</label>
        <input type="password" id="claude-key" placeholder="sk-ant-..." autocomplete="off">
        <a class="key-link" href="https://console.anthropic.com/settings/keys" target="_blank">Get API key →</a>
      </div>
      <div class="field">
        <label for="claude-model">Model</label>
        <select id="claude-model">
          <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku — fast (recommended)</option>
          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet — best quality</option>
          <option value="claude-3-opus-20240229">Claude 3 Opus — most capable</option>
        </select>
      </div>
    </div>

    <!-- Gemini -->
    <div id="gemini-section" class="provider-section hidden">
      <div class="field">
        <label for="gemini-key">Google Gemini API key</label>
        <input type="password" id="gemini-key" placeholder="AIza..." autocomplete="off">
        <a class="key-link" href="https://aistudio.google.com/app/apikey" target="_blank">Get API key →</a>
      </div>
      <div class="field">
        <label for="gemini-model">Model</label>
        <select id="gemini-model">
          <option value="gemini-2.0-flash">Gemini 2.0 Flash — fast (recommended)</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro — best quality</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash — fast & cheap</option>
        </select>
      </div>
    </div>

    <button id="save-btn">Save settings</button>
    <div id="status"></div>

  </div>

  <div class="footer">
    Your API keys are stored only in your browser using <code>chrome.storage.local</code>.
    They are never sent to any server other than your chosen provider.
    <br><br>
    <a href="https://github.com/your-username/quip" target="_blank">GitHub (open source)</a>
  </div>

  <script type="module" src="popup.ts"></script>
</body>
</html>
```

---

## 22. src/popup/popup.css

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  background: #ffffff;
  width: 320px;
  min-height: 100px;
}

.header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #5b4fcf;
}

.tagline {
  font-size: 11px;
  color: #999;
}

.form { padding: 14px 16px; }

.field { margin-bottom: 12px; }

label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #777;
  margin-bottom: 5px;
}

input[type="password"],
select {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid #e0e0e0;
  border-radius: 7px;
  font-size: 13px;
  color: #1a1a1a;
  background: #fafafa;
  outline: none;
  transition: border-color 0.15s;
}
input:focus, select:focus { border-color: #a89cf5; background: #fff; }

.key-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: #5b4fcf;
  text-decoration: none;
}
.key-link:hover { text-decoration: underline; }

.provider-section.hidden { display: none; }

#save-btn {
  width: 100%;
  padding: 10px;
  background: #5b4fcf;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 4px;
}
#save-btn:hover { background: #4a3eb8; }

#status {
  margin-top: 8px;
  font-size: 12px;
  min-height: 18px;
  text-align: center;
}
#status.success { color: #059669; }
#status.error { color: #dc2626; }

.footer {
  padding: 12px 16px 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 11px;
  color: #aaa;
  line-height: 1.6;
}
.footer a { color: #5b4fcf; text-decoration: none; }
.footer a:hover { text-decoration: underline; }
.footer code { font-size: 10px; background: #f3f0ff; padding: 1px 4px; border-radius: 3px; }

@media (prefers-color-scheme: dark) {
  body { background: #1c1c2e; color: #e4e4f0; }
  .header { border-color: #2a2a40; }
  input, select { background: #252540; border-color: #3a3a5c; color: #e4e4f0; }
  input:focus, select:focus { border-color: #7c6fe0; background: #2a2a50; }
  .footer { border-color: #2a2a40; color: #666; }
  .field label { color: #666; }
}
```

---

## 23. .gitignore

```
node_modules/
dist/
*.zip
.DS_Store
.env
*.local
```

---

## 24. README.md

```markdown
# Quip

AI-powered comment generator for LinkedIn and X. Open source. Bring your own API key.

No subscription. No quota. No data leaves your browser (except to your chosen LLM provider).

## Supported providers
- OpenAI (GPT-4o, GPT-4o mini, GPT-3.5 Turbo)
- Anthropic Claude (Claude 3.5 Sonnet, Haiku, Opus)
- Google Gemini (Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash)

## Install (developer mode)

1. Download the latest `quip-release.zip` from Releases and unzip it, OR clone this repo and run `npm run build`
2. Open `brave://extensions` or `chrome://extensions`
3. Enable Developer Mode (toggle, top right)
4. Click "Load unpacked" → select the `dist/` folder
5. Click the Quip icon in your toolbar → enter your API key → Save

## Usage

Open LinkedIn or X. Click Comment on any post. The Quip panel appears below.
Pick your tone, length, and wit level. Click Generate. Copy or insert the result.
Click anywhere outside to dismiss. The next post starts completely fresh.

## Development

```bash
npm install
npm run dev        # builds and watches
```

Load the `dist/` folder as an unpacked extension in Brave.

## Contributing

PRs welcome. See CONTRIBUTING.md.

## License

MIT
```

---

## 25. First-run checklist for the AI IDE

When generating code from this document, follow this order:

1. Scaffold the directory structure exactly as shown in Section 4
2. Create `package.json` and run `npm install`
3. Create `tsconfig.json` and `vite.config.ts`
4. Create `manifest.json`
5. Create all files under `src/content/shared/` first (types, selectors, extractor, llm, panel)
6. Create `src/background/service-worker.ts` and its three provider files
7. Create `src/content/linkedin.ts` and `src/content/twitter.ts`
8. Create `src/popup/popup.html`, `popup.ts`, `popup.css`
9. Create placeholder PNG icons (16×16, 48×48, 128×128) in `public/icons/`
10. Run `npm run build` — it should compile with zero TypeScript errors
11. Load `dist/` as unpacked extension in Brave
12. Navigate to LinkedIn, click Comment on a post — the Quip panel should appear

---

## 26. Key rules for the AI IDE — never violate these

- **No frameworks in content scripts.** `panel.ts` must be vanilla TypeScript DOM manipulation only.
- **All LLM calls happen in the service worker**, never in content scripts. Content scripts send a `chrome.runtime.sendMessage` and await the response.
- **All DOM selectors live in `selectors.ts`** — never hardcode a selector string in `linkedin.ts` or `twitter.ts`.
- **Panel state is local to each mount** — no global state module, no shared store. Every call to `mountPanel()` creates fresh local state.
- **`unmountPanel()` is called before mounting a new panel** — never allow two panels at once.
- **Shadow DOM is non-negotiable** — the panel must use `host.attachShadow({ mode: 'closed' })`. No exceptions.
- **No `MutationObserver` on `document.body`** — this is the core performance fix. If you need to observe DOM changes, observe only the specific feed container element, not the full document.
- **TypeScript strict mode must pass** — run `npm run typecheck` and fix all errors before considering any feature done.
- **API keys are stored with `chrome.storage.local`** under the key `quip_settings` — never `localStorage`, never cookies, never hardcoded.