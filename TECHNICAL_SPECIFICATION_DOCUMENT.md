# **TECHNICAL SPECIFICATION DOCUMENT**
## **LinkedIn AI Comment Assistant (Open Source)**

**Version:** 1.0  
**Architecture:** Manifest V3  
**Target Platform:** Chrome/Brave (LinkedIn only, Phase 1)  
**Model:** BYOK (Bring Your Own Key) - Open Source  

---

## **1. EXECUTIVE SUMMARY**

Build a high-performance, open-source LinkedIn comment generation extension that uses user-provided API keys (OpenAI/Anthropic/Groq). Features a **Global Profile System** for one-click generation with optional per-post overrides. Uses Shadow DOM isolation and IntersectionObserver to maintain LinkedIn performance (<50ms overhead).

**Key Differentiators:**
- Zero persistent UI elements (injected only on interaction)
- Multi-profile support (e.g., "Job Seeker" vs "Thought Leader")
- Complete style isolation via Shadow DOM
- No backend/proxy - direct API calls only

---

## **2. ARCHITECTURE OVERVIEW**

### **2.1 System Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (Chrome/Brave)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   POPUP UI   │  │  OPTION PAGE │  │   CONTENT SCRIPT │ │
│  │  (React/     │  │  (Advanced   │  │   (Injected on   │ │
│  │  Preact)     │  │   Settings)  │  │    demand)       │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │           │
│         └─────────────────┴────────────────────┘           │
│                           │                                 │
│              ┌────────────▼────────────┐                   │
│              │  SERVICE WORKER         │                   │
│              │  (Background Script)    │                   │
│              │  - API Key Management   │                   │
│              │  - LLM API Calls        │                   │
│              │  - Secure Storage       │                   │
│              └────────────┬────────────┘                   │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │  OpenAI    │   │ Anthropic  │   │    Groq    │         │
│  │   API      │   │    API     │   │    API     │         │
│  └────────────┘   └────────────┘   └────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### **2.2 Performance Strategy**
- **Lazy Loading:** Content script injected only when user clicks extension icon OR hovers over a post (configurable)
- **IntersectionObserver:** Detect posts entering viewport without blocking main thread
- **Shadow DOM:** Complete CSS/JS isolation prevents LinkedIn conflicts
- **Service Worker Offloading:** All API calls happen in background script, not content script
- **Immediate Cleanup:** Disconnect observers and remove DOM elements when panel closes

---

## **3. DATA MODELS & STORAGE SCHEMA**

### **3.1 Chrome Storage Schema (chrome.storage.local)**

```typescript
// PRIMARY STORAGE KEYS

interface ExtensionStorage {
  // Key: 'profiles'
  profiles: {
    activeProfileId: string;
    items: Record<string, UserProfile>;
  };
  
  // Key: 'apiKeys'
  apiKeys: {
    openai?: string;
    anthropic?: string;
    groq?: string;
  };
  
  // Key: 'settings'
  settings: {
    behavior: BehaviorSettings;
    ui: UISettings;
  };
  
  // Key: 'history' (optional, last 50 items)
  history: CommentHistoryItem[];
}

// INDIVIDUAL INTERFACES

interface UserProfile {
  id: string;                    // UUID
  name: string;                  // "Job Seeker", "Thought Leader"
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  
  // Identity Section
  persona: {
    role: string;               // "Senior Product Manager"
    industry: string;           // "Enterprise SaaS"
    expertise: string[];        // ["AI", "Growth", "UX"]
    voiceDescription: string;   // "I speak directly but empathetically"
  };
  
  // Generation Defaults (The 10 parameters)
  preferences: {
    tone: 'professional' | 'casual' | 'witty' | 'encouraging' | 
          'challenging' | 'empathetic';
    length: 'short' | 'medium' | 'long';
    intents: Array<'agree' | 'disagree' | 'question' | 'insight' | 
                   'experience' | 'resource' | 'gratitude' | 
                   'networking' | 'humor'>;
    formality: 'formal' | 'neutral' | 'informal';
    useEmojis: boolean;
    mentionAuthor: boolean;
    includeCTA: boolean;
    style: 'storytelling' | 'data-driven' | 'philosophical' | 'direct';
  };
  
  // AI Provider Selection
  aiConfig: {
    provider: 'openai' | 'anthropic' | 'groq';
    model: string;              // Provider-specific model ID
    fallbackProvider?: 'openai' | 'anthropic' | 'groq';
  };
}

interface BehaviorSettings {
  triggerMode: 'click' | 'hover';        // How AI button appears
  autoInsert: boolean;                  // Auto-fill vs copy-to-clipboard
  generateCount: 2 | 3 | 4;             // Number of options to generate
  showQuickTweaks: boolean;             // Show override chips
  quickTweaks: string[];                // Which tweaks to show (max 4)
}

interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  panelPosition: 'auto' | 'center';     // Auto = near post, Center = modal
  buttonStyle: 'icon' | 'text' | 'both'; // AI button appearance
}

interface CommentHistoryItem {
  id: string;
  profileId: string;
  postUrl: string;
  postAuthor: string;
  postSnippet: string;        // First 100 chars
  generatedComment: string;
  usedOverride: boolean;
  timestamp: number;
}
```

### **3.2 Session-Only State (Memory)**
Not persisted to storage:
```typescript
interface SessionState {
  currentOverrides: Partial<UserProfile['preferences']>;
  activePanel: string | null;        // Post ID currently open
  isGenerating: boolean;
  lastGenerated: {
    postId: string;
    options: string[];
    timestamp: number;
  } | null;
}
```

---

## **4. USER INTERFACE SPECIFICATIONS**

### **4.1 Extension Popup (Main Configuration)**

**Layout:** Modal popup (400px width, 600px max height, scrollable)

**Sections:**

1. **Header**
   - Title: "AI Comment Assistant"
   - Profile Switcher Dropdown (if multiple profiles exist)
   - "Add New Profile" button

2. **Profile Configuration Form**
   
   **Identity Card:**
   - Profile Name (text input, placeholder: "e.g., Job Seeker Mode")
   - Your Role (text input)
   - Industry (text input with autocomplete: Tech, Finance, Healthcare, etc.)
   - Areas of Expertise (tag input, comma-separated)
   - Voice Description (textarea, placeholder: "How do you usually speak?")

   **Default Style Accordion:**
   - Tone: 6 radio buttons with icons
     - 👔 Professional | 😊 Casual | 😄 Witty | 🙌 Encouraging | 🤔 Challenging | 💙 Empathetic
   - Length: Segmented control [Short] [Medium] [Long]
   - Intent: 9 checkboxes in 3x3 grid
     - ☑️ Agree ☐ Disagree ☑️ Question
     - ☑️ Insight ☐ Experience ☐ Resource
     - ☐ Gratitude ☑️ Networking ☐ Humor
   - Advanced Options (collapsible):
     - Formality: [Formal] [Neutral] [Informal]
     - Style: [Direct] [Storytelling] [Data-Driven] [Philosophical]
     - Emojis: Toggle switch
     - Mention Author: Toggle switch
     - Include CTA: Toggle switch

   **AI Configuration:**
   - Provider: Dropdown [OpenAI, Anthropic, Groq]
   - Model: Dependent dropdown (updates based on provider)
   - API Key: Password input with "Show" toggle
   - Test Connection button (validates key with minimal API call)

3. **Behavior Settings (Tab or Accordion)**
   - Trigger Mode: [Click to show button] [Hover to show button]
   - Generation: "Generate [3] options" (number input 2-4)
   - Insertion: [Copy to clipboard] [Auto-insert into comment box]
   - Quick Tweaks: Multi-select of 4 from: [Shorter] [Longer] [More Casual] [More Professional] [Funnier] [Add Question] [Remove Emojis]

4. **Footer**
   - "Save Profile" button (primary)
   - "Reset to Defaults" link
   - Status indicator: "✅ Ready" or "⚠️ API Key Required"

### **4.2 Per-Post Panel (Content Script)**

**Trigger:** User clicks AI button (✨) injected into LinkedIn post action bar

**Specs:**
- **Container:** Shadow DOM attached to fixed-position host element
- **Position:** Absolute positioning relative to viewport, calculated to appear near the post but not overflow screen
- **Dimensions:** 380px width, auto-height (max 500px), scrollable content
- **Z-Index:** 999999 (above LinkedIn's 9999)

**Layout:**
```
┌──────────────────────────────────────────┐
│  ✨ AI Assistant                    [×]  │
├──────────────────────────────────────────┤
│  Using: [Job Seeker] ▼                   │
│  ⚙️ Professional · Medium · Insight      │
│  [🔄 Generate Comment]                   │
├──────────────────────────────────────────┤
│  ⚡ Quick Tweaks:                        │
│  [Shorter] [Funnier] [Network] [Casual]  │
├──────────────────────────────────────────┤
│  Generating... (skeleton loader)         │
├──────────────────────────────────────────┤
│  Option 1:                               │
│  "Your perspective on scaling teams...   │
│   resonates with my experience at..."    │
│  [Use This] [Copy] [↻ Regenerate]        │
├──────────────────────────────────────────┤
│  Option 2:                               │
│  "Interesting point. I've found that..." │
│  [Use This] [Copy]                       │
├──────────────────────────────────────────┤
│  [Modify Request] → Opens text input     │
└──────────────────────────────────────────┘
```

**Interactive Elements:**
- **Profile Switcher:** Dropdown to temporarily use different profile for this post
- **Quick Tweaks:** Click applies override for this generation only (resets after)
- **Use This:** Inserts text into LinkedIn's native comment textarea (if autoInsert enabled) or copies to clipboard
- **Modify Request:** Text input for ad-hoc instructions ("Make it shorter and mention my startup")

**Empty State (First Use):**
```
┌──────────────────────────────────────────┐
│  ✨ AI Assistant                    [×]  │
├──────────────────────────────────────────┤
│  🎉 Welcome!                             │
│                                          │
│  This extension uses your own AI API     │
│  keys to generate comments.              │
│                                          │
│  [Complete Setup]                        │
│                                          │
│  Or try with defaults:                   │
│  [Generate with Defaults]                │
└──────────────────────────────────────────┘
```

---

## **5. LINKEDIN INTEGRATION SPECIFICATIONS**

### **5.1 DOM Selectors (Stable)**
LinkedIn obfuscates classes but uses stable data attributes :

```typescript
const LINKEDIN_SELECTORS = {
  // Feed container
  feedContainer: '[data-view-name="feed-root"]',
  
  // Individual posts (stable)
  post: {
    container: '[data-view-name="feed-item"], [data-urn*="urn:li:activity"]',
    textContent: [
      '.feed-shared-update-v2__description',
      '.feed-shared-text',
      '[data-test-id="feed-shared-text"]',
      '.update-components-text'
    ].join(', '),
    actionBar: '.feed-shared-social-actions, .social-actions',
    authorName: '.feed-shared-actor__name, .update-components-actor__name',
    authorTitle: '.feed-shared-actor__description, .update-components-actor__description',
    commentBox: '[data-view-name="comment-composer"] textarea, .comments-comment-box__form textarea',
    
    // For detecting if user has already commented
    existingComments: '.comments-comment-item'
  }
};
```

### **5.2 Injection Strategy**

**Phase 1: Detection**
```typescript
// Use IntersectionObserver (not MutationObserver) for performance
const postObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      injectAIButton(entry.target);
    }
  });
}, {
  root: null,
  rootMargin: '100px',
  threshold: 0.1
});

// Observe all posts currently in DOM
document.querySelectorAll(LINKEDIN_SELECTORS.post.container).forEach(post => {
  if (!post.dataset.aiButtonInjected) {
    postObserver.observe(post);
  }
});
```

**Phase 2: Button Injection**
```typescript
function injectAIButton(postElement: HTMLElement) {
  // Check if already injected
  if (postElement.querySelector('.ai-comment-btn')) return;
  
  const actionBar = postElement.querySelector(LINKEDIN_SELECTORS.post.actionBar);
  if (!actionBar) return;
  
  const btn = document.createElement('button');
  btn.className = 'ai-comment-btn';
  btn.innerHTML = '<span>✨</span><span class="text">AI</span>';
  btn.title = 'Generate AI Comment';
  
  // Apply minimal inline styles (rest in Shadow DOM)
  btn.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px;
    color: #666;
    font-size: 14px;
    font-weight: 600;
  `;
  
  btn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    openAIPanel(postElement);
  };
  
  actionBar.appendChild(btn);
  postElement.dataset.aiButtonInjected = 'true';
}
```

**Phase 3: Text Extraction**
```typescript
function extractPostData(postElement: HTMLElement): PostData {
  const textEl = postElement.querySelector(LINKEDIN_SELECTORS.post.textContent);
  const authorEl = postElement.querySelector(LINKEDIN_SELECTORS.post.authorName);
  
  return {
    text: textEl?.textContent?.trim() || '',
    author: authorEl?.textContent?.trim() || 'Unknown',
    url: window.location.href,
    timestamp: Date.now()
  };
}
```

**Phase 4: Text Insertion**
```typescript
function insertComment(postElement: HTMLElement, text: string) {
  const textarea = postElement.querySelector(LINKEDIN_SELECTORS.post.commentBox);
  if (!textarea) {
    // Scroll to comment section and try again, or copy to clipboard
    return { success: false, method: 'clipboard' };
  }
  
  // Focus and set value
  textarea.focus();
  textarea.value = text;
  
  // Trigger input event for LinkedIn's React
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  
  // Optional: Auto-click post button if setting enabled
  if (settings.behavior.autoInsert) {
    const postBtn = postElement.querySelector('.comments-comment-box__submit-button');
    if (postBtn && !postBtn.disabled) {
      (postBtn as HTMLElement).click();
    }
  }
  
  return { success: true };
}
```

---

## **6. AI PROVIDER INTEGRATION**

### **6.1 Supported Providers & Models**

```typescript
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast/Cheap)', maxTokens: 150 },
      { id: 'gpt-4o', name: 'GPT-4o (High Quality)', maxTokens: 150 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 150 }
    ],
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)', maxTokens: 150 },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', maxTokens: 150 }
    ],
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    })
  },
  
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Ultra Fast)', maxTokens: 150 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', maxTokens: 150 }
    ],
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  }
};
```

### **6.2 Prompt Engineering Template**

```typescript
function buildPrompt(
  postData: PostData, 
  profile: UserProfile, 
  overrides: Partial<UserProfile['preferences']> = {},
  modifyRequest?: string
): string {
  
  const prefs = { ...profile.preferences, ...overrides };
  
  const intentDescriptions = {
    agree: "Validate the author's perspective and add supporting context",
    disagree: "Respectfully offer a counter-perspective with evidence",
    question: "Ask a thoughtful follow-up question to deepen discussion",
    insight: "Add a unique insight, nuance, or alternative angle",
    experience: "Share relevant personal/professional experience briefly",
    resource: "Recommend a specific book, article, tool, or connection",
    gratitude: "Express genuine appreciation for the share",
    networking: "Suggest continuing the conversation offline/connecting",
    humor: "Add light, professional humor relevant to the topic"
  };
  
  const lengthMap = {
    short: '1-2 sentences (25-50 words)',
    medium: '3-4 sentences (50-100 words)',
    long: '5+ sentences (100-150 words)'
  };

  return `
You are an expert LinkedIn engagement assistant helping ${profile.persona.role} write authentic comments.

CONTEXT:
- Post Author: ${postData.author}
- Post Content: "${postData.text.substring(0, 1500)}"
- Your Identity: ${profile.persona.role} in ${profile.persona.industry}
- Your Voice: ${profile.persona.voiceDescription}
- Your Expertise: ${profile.persona.expertise.join(', ')}

GENERATION REQUIREMENTS:
- Tone: ${prefs.tone}
- Length: ${lengthMap[prefs.length]}
- Intent: ${prefs.intents.map(i => intentDescriptions[i]).join('; ')}
- Formality: ${prefs.formality}
- Style: ${prefs.style}
- ${prefs.useEmojis ? 'Include 1-2 relevant professional emojis' : 'No emojis'}
- ${prefs.mentionAuthor ? `Address author by first name (${postData.author.split(' ')[0]})` : 'Do not use name'}
- ${prefs.includeCTA ? 'End with an engaging question' : 'No call-to-action'}

${modifyRequest ? `SPECIAL INSTRUCTION: ${modifyRequest}` : ''}

CRITICAL RULES:
1. Be specific to the post content - reference specific points made
2. Avoid generic phrases: "Great post!", "Thanks for sharing", "Love this"
3. Sound human and authentic, not robotic or overly salesy
4. Each option must be distinct in approach/angle
5. Do not use hashtags unless the original post did
6. Return EXACTLY ${profile.aiConfig.model === 'groq' ? '3' : '3'} comment options separated by "---"

OUTPUT FORMAT:
Option 1: [Text]
---
Option 2: [Text]
---
Option 3: [Text]
  `.trim();
}
```

### **6.3 API Call Implementation (Service Worker)**

```typescript
// background.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GENERATE_COMMENTS') {
    handleGeneration(request.payload)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async
  }
});

async function handleGeneration(payload: GenerationRequest) {
  const { provider, model, apiKey, prompt, temperature = 0.7 } = payload;
  
  const config = AI_PROVIDERS[provider];
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: 400,
      n: 1
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse the "---" separated options
  const options = content.split('---').map(opt => 
    opt.replace(/^Option \d:/i, '').trim()
  ).filter(opt => opt.length > 10);
  
  return { options };
}
```

---

## **7. PROJECT FILE STRUCTURE**

```
linkedin-ai-assistant/
├── manifest.json                 # Manifest V3 configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Build configuration
│
├── src/
│   ├── types/
│   │   ├── storage.ts            # All storage interfaces
│   │   ├── linkedin.ts           # LinkedIn DOM types
│   │   └── ai.ts                 # AI provider types
│   │
│   ├── background/
│   │   ├── index.ts              # Service worker entry
│   │   ├── api-handlers.ts       # AI provider API calls
│   │   └── storage.ts            # chrome.storage wrappers
│   │
│   ├── content/
│   │   ├── index.ts              # Content script entry
│   │   ├── post-detector.ts      # IntersectionObserver logic
│   │   ├── button-injector.ts    # AI button injection
│   │   ├── panel-controller.ts   # Shadow DOM panel management
│   │   ├── text-extractor.ts     # LinkedIn text parsing
│   │   └── styles/
│   │       └── panel-styles.css  # Injected into Shadow DOM
│   │
│   ├── popup/
│   │   ├── index.html            # Popup HTML entry
│   │   ├── main.tsx              # React/Preact root
│   │   ├── components/
│   │   │   ├── ProfileForm.tsx   # Main configuration form
│   │   │   ├── PersonaSection.tsx
│   │   │   ├── PreferencesSection.tsx
│   │   │   ├── AIConfigSection.tsx
│   │   │   └── BehaviorSection.tsx
│   │   └── hooks/
│   │       ├── useStorage.ts     # chrome.storage hooks
│   │       └── useProfiles.ts    # Profile management
│   │
│   ├── shared/
│   │   ├── prompt-builder.ts     # Prompt engineering logic
│   │   ├── constants.ts          # Selectors, defaults
│   │   └── utils.ts              # Helpers
│   │
│   └── assets/
│       ├── icons/                # 16x16, 48x48, 128x128 PNGs
│       └── logo.svg
│
└── docs/
    ├── PRIVACY.md                # Privacy policy (local only)
    └── CONTRIBUTING.md
```

---

## **8. IMPLEMENTATION PHASES**

### **Phase 1: Core Foundation (Week 1)**
- [ ] Manifest V3 setup with minimal permissions
- [ ] Storage schema implementation (chrome.storage.local)
- [ ] Service worker with secure API key handling
- [ ] OpenAI integration only (single provider)
- [ ] Basic popup UI (HTML/CSS only, no framework yet)
- [ ] Content script with IntersectionObserver post detection
- [ ] Simple Shadow DOM panel (vanilla JS)

**Deliverable:** Extension generates 3 basic comments using global settings

### **Phase 2: Profile System (Week 2)**
- [ ] Multi-profile data model
- [ ] Profile CRUD in popup
- [ ] Profile switching UI in per-post panel
- [ ] Import/export profiles (JSON)
- [ ] Default profile selection

**Deliverable:** Users can create/switch between "Job Seeker" and "Personal Brand" profiles

### **Phase 3: Full Customization (Week 3)**
- [ ] All 10 preference parameters in UI
- [ ] Intent multi-select (9 options)
- [ ] Quick Tweaks system (customizable chips)
- [ ] Override logic (session-based)
- [ ] Anthropic and Groq provider integration
- [ ] Model selection per provider

**Deliverable:** Complete customization with 3 AI providers

### **Phase 4: Polish & Performance (Week 4)**
- [ ] React/Preact migration for popup UI
- [ ] LinkedIn text insertion (auto-fill comment box)
- [ ] Error handling (rate limits, invalid keys)
- [ ] First-time user onboarding flow
- [ ] Comment history (last 50)
- [ ] Dark mode support

**Deliverable:** Production-ready extension with onboarding

### **Phase 5: Future (Post-MVP)**
- [ ] Twitter/X support
- [ ] Sync across devices (chrome.storage.sync option)
- [ ] Keyboard shortcuts (Ctrl+Shift+C)
- [ ] Custom prompt templates
- [ ] Analytics (local only: comment usage stats)

---

## **9. PERFORMANCE REQUIREMENTS**

### **Metrics to Maintain**
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Initial Load** | 0ms | Extension inactive until clicked |
| **Post Detection** | <16ms | Time to detect and inject button |
| **Panel Open** | <100ms | Time from click to visible UI |
| **Generation** | <3s | API call + parsing (depends on provider) |
| **Memory Usage** | <20MB | chrome://extensions inspect views |
| **Scroll FPS** | 55-60fps | No frame drops during feed scroll |

### **Optimization Checklist**
- [ ] Use `requestIdleCallback` for non-critical initialization
- [ ] Debounce any resize/scroll handlers (if absolutely necessary)
- [ ] Disconnect IntersectionObserver when panel opens (pause detection)
- [ ] Remove Shadow DOM host element immediately after closing panel
- [ ] No React/Vue in content script (vanilla JS only for panel)
- [ ] Minimize CSS in Shadow DOM (<5KB)
- [ ] Tree-shake unused code from bundle

---

## **10. SECURITY & PRIVACY SPECIFICATIONS**

### **Security Requirements**
1. **API Key Storage**
   - Store in `chrome.storage.local` (encrypted at rest by Chrome)
   - Never log to console or send to any server
   - Memory-only during API calls (no persistent variables)

2. **Content Isolation**
   - All extension UI in Shadow DOM with `mode: 'closed'`
   - No inline scripts in main document
   - CSP compliant (no eval/new Function)

3. **Network**
   - HTTPS only for API calls
   - No third-party analytics or tracking
   - No CORS proxy (direct API calls only)

### **Privacy Policy (Summary)**
- **Data Collection**: None (zero telemetry)
- **Data Storage**: 100% local (chrome.storage)
- **Third Parties**: User's chosen AI provider only (OpenAI/Anthropic/Groq)
- **LinkedIn Data**: Post text extracted temporarily for generation, never stored remotely

---

## **11. TESTING STRATEGY**

### **Manual Testing Scenarios**
1. **First Install**: Fresh profile, no API key, click on LinkedIn post
2. **Generation Flow**: Complete setup, generate comments, insert into LinkedIn
3. **Profile Switching**: Create 3 profiles, switch between them on same post
4. **Quick Overrides**: Apply "Funnier" tweak, verify it changes output
5. **Error Handling**: Invalid API key, rate limit, network offline
6. **Performance**: Scroll through 50 posts, verify no lag
7. **LinkedIn Updates**: Verify selectors still work after LinkedIn UI update

### **Edge Cases**
- Post with no text (image only)
- Very long post (>3000 characters)
- Comment box not yet loaded (user hasn't clicked "Comment")
- User switches profiles mid-generation
- Multiple LinkedIn tabs open simultaneously

---

## **12. DELIVERABLES CHECKLIST**

### **For Developer/AI**
- [ ] Complete source code matching this specification
- [ ] `manifest.json` with correct permissions
- [ ] Build script (Vite/Webpack) producing `dist/` folder
- [ ] README with installation instructions

### **For Chrome Web Store**
- [ ] 1280x800 screenshot (LinkedIn with panel open)
- [ ] 440x280 promotional image
- [ ] Privacy policy URL (GitHub repo/docs)
- [ ] Store description emphasizing "BYOK" and "Privacy First"

### **For Users**
- [ ] Installation guide (GitHub README)
- [ ] Video/GIF demo of setup and usage
- [ ] Troubleshooting guide (API key issues, LinkedIn changes)

---

## **13. OPEN QUESTIONS FOR CLARIFICATION**

Before development begins, confirm:

1. **Framework**: React or Preact for popup? (Recommend Preact for smaller bundle)
2. **Styling**: Tailwind CSS or plain CSS modules? (Recommend Tailwind with purge)
3. **Build Tool**: Vite or Webpack? (Recommend Vite for speed)
4. **TypeScript**: Strict mode or loose? (Recommend strict)
5. **Icons**: Lucide, Heroicons, or custom? (Recommend Lucide React)
6. **LinkedIn Premium**: Do we need to support Sales Navigator UI? (Recommend standard only for MVP)