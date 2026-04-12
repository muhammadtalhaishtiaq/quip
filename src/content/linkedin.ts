/**
 * Content script for LinkedIn
 * Supports two modes:
 * 1) Sticky right sidebar
 * 2) Inline panel above LinkedIn composer
 */

import { extractPostData } from './shared/extractor';
import { QuipPanel } from './shared/panel';
import { getSettings } from '../shared/storage';
import { GenerateOptions, PanelMode, PostData, StoredSettings, Tone, Length, Intent } from './shared/types';
import { LINKEDIN_SELECTORS } from './shared/selectors';

let sidebarPanel: QuipPanel | null = null;
let activePanel: QuipPanel | null = null;
let activePanelMode: PanelMode = 'sidebar';
let activeInlineHost: HTMLDivElement | null = null;
let activeComposer: Element | null = null;
let composerCloseObserver: MutationObserver | null = null;
let currentPostData: PostData | null = null;
let currentPostElement: Element | null = null;
let currentUserSettings: StoredSettings | null = null;

// Session-only filter state (persists across posts until extension reload)
let lastUsedFilters: {
  tone: Tone[];
  length: Length;
  intent: Intent[];
} | null = null;

/**
 * Initialize or create the sticky sidebar
 */
function initializeSidebar(): QuipPanel {
  if (sidebarPanel) return sidebarPanel;

  // Create sidebar container
  const sidebarHost = document.createElement('div');
  sidebarHost.id = 'quip-sidebar-host';
  sidebarHost.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    z-index: 999998;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    display: none;
    overflow: hidden;
  `;

  document.body.appendChild(sidebarHost);

  sidebarPanel = new QuipPanel(sidebarHost, 'sidebar');

  return sidebarPanel;
}

function destroyInlinePanel(): void {
  if (composerCloseObserver) {
    composerCloseObserver.disconnect();
    composerCloseObserver = null;
  }

  if (activeInlineHost) {
    activeInlineHost.remove();
    activeInlineHost = null;
  }

  if (activePanelMode === 'inline') {
    activePanel = null;
  }

  activeComposer = null;
}

function setupComposerCloseObserver(postElement: Element, composer: Element): void {
  if (composerCloseObserver) {
    composerCloseObserver.disconnect();
  }

  composerCloseObserver = new MutationObserver(() => {
    const composerStillInDom = document.body.contains(composer);
    if (!composerStillInDom) {
      destroyInlinePanel();
    }
  });

  composerCloseObserver.observe(postElement, {
    childList: true,
    subtree: true,
  });
}

async function waitForComposerInPost(postElement: Element, timeoutMs: number = 2500): Promise<Element | null> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const composer = postElement.querySelector(LINKEDIN_SELECTORS.commentTextarea);
    if (composer) {
      return composer;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return null;
}

function setupPanelCallbacks(panel: QuipPanel): void {
  panel.setOnGenerate(generateComment);

  panel.setOnInsertResult(({ text }) => {
    injectCommentToTextarea(text);
    if (activePanelMode === 'inline') {
      destroyInlinePanel();
    }
  });

  panel.setOnCopyResult((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  });

  // Track filter changes for session persistence
  panel.setOnStateChange((state) => {
    if (state.tone || state.length || state.intent) {
      lastUsedFilters = {
        tone: state.tone || lastUsedFilters?.tone || [],
        length: state.length || lastUsedFilters?.length || 'medium',
        intent: state.intent || lastUsedFilters?.intent || [],
      };
    }
  });
}

async function initializeInlinePanel(postElement: Element): Promise<QuipPanel | null> {
  const composer = await waitForComposerInPost(postElement);

  if (!composer) {
    return null;
  }

  destroyInlinePanel();

  const inlineHost = document.createElement('div');
  inlineHost.id = 'quip-inline-host';
  inlineHost.style.cssText = `
    width: min(720px, 100%);
    margin: 0 0 12px 0;
    position: relative;
    z-index: 2;
  `;

  composer.parentElement?.insertBefore(inlineHost, composer);

  const inlinePanel = new QuipPanel(inlineHost, 'inline');
  setupPanelCallbacks(inlinePanel);

  // Seed with last-used filters if available, otherwise use global defaults
  if (lastUsedFilters) {
    inlinePanel.setState({
      tone: lastUsedFilters.tone,
      length: lastUsedFilters.length,
      intent: lastUsedFilters.intent,
    });
  }

  activeInlineHost = inlineHost;
  activeComposer = composer;
  setupComposerCloseObserver(postElement, composer);

  return inlinePanel;
}

/**
 * Check if user has API key configured
 */
async function hasApiKeyConfigured(): Promise<boolean> {
  const settings = await getSettings();
  return !!settings.apiKey;
}

/**
 * Get user settings
 */
async function getUserSettings(): Promise<StoredSettings> {
  return getSettings();
}

/**
 * Find the post container from the comment button
 */
function findPostContainerFromButton(button: Element): Element | null {
  let current: Element | null = button;

  while (current && current !== document.body) {
    if (current.getAttribute('role') === 'listitem') {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Generate comment by sending message to service worker
 */
async function generateComment(): Promise<void> {
  if (!activePanel || !currentPostData || !currentUserSettings) {
    return;
  }

  try {
    activePanel.setState({ isLoading: true, error: null });

    // Get current panel state for UI controls (tone, length, intent only)
    const panelState = activePanel.getState() || {
      tone: currentUserSettings.defaultTone,
      length: currentUserSettings.defaultLength,
      intent: currentUserSettings.defaultIntent,
      isLoading: false,
      results: [],
      error: null,
    };

    const generateOptions: GenerateOptions = {
      postText: currentPostData.text,
      postAuthor: currentPostData.author,
      excerpt: currentPostData.excerpt,
      tone: panelState.tone,
      length: panelState.length,
      intent: panelState.intent,
      role: currentUserSettings.role,
      commenterInterests: currentUserSettings.commenterInterests || '',
      useEmojis: currentUserSettings.useEmojis,
      mentionAuthor: currentUserSettings.mentionAuthor,
      customInstruction: currentUserSettings.customInstruction || '',
      formality: currentUserSettings.formality,
      temperature: currentUserSettings.temperature ?? 0.75,
    };

    const response = await new Promise<{
      status: string;
      data?: { comments?: string[] };
      error?: { message?: string };
    }>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'GENERATE', options: generateOptions },
        (response: { status: string; data?: { comments?: string[] }; error?: { message?: string } }) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response?.status === 'success') {
      activePanel.setState({
        isLoading: false,
        results: response.data?.comments || [],
      });
    } else {
      const errorMsg = response?.error?.message || 'Failed to generate comment';
      activePanel.setState({
        isLoading: false,
        error: errorMsg,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    activePanel.setState({
      isLoading: false,
      error: errorMsg,
    });
  }
}

/**
 * Inject the generated comment into LinkedIn's comment textarea
 */
function injectCommentToTextarea(commentText: string) {
  if (!currentPostElement) return;

  const composerTarget =
    (activeComposer as HTMLElement | null) ||
    (currentPostElement.querySelector(LINKEDIN_SELECTORS.commentTextarea) as HTMLElement | null);

  if (composerTarget instanceof HTMLTextAreaElement) {
    composerTarget.value = commentText;
    composerTarget.dispatchEvent(new Event('input', { bubbles: true }));
    composerTarget.dispatchEvent(new Event('change', { bubbles: true }));
    composerTarget.focus();
    composerTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (composerTarget && composerTarget.getAttribute('contenteditable') === 'true') {
    composerTarget.textContent = commentText;
    composerTarget.dispatchEvent(new Event('input', { bubbles: true }));
    composerTarget.dispatchEvent(new Event('change', { bubbles: true }));
    composerTarget.focus();
    composerTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Handle LinkedIn comment button click
 */
async function handleCommentButtonClick(button: Element) {
  const postElement = findPostContainerFromButton(button);
  if (!postElement) {
    return;
  }

  const hasKey = await hasApiKeyConfigured();
  if (!hasKey) {
    return;
  }

  const postData = extractPostData(postElement);
  if (!postData || !postData.text) {
    return;
  }

  // Get user settings
  const userSettings = await getUserSettings();

  // Update current context
  currentPostData = postData;
  currentPostElement = postElement;
  currentUserSettings = userSettings;
  activePanelMode = userSettings.panelMode || 'sidebar';

  if (activePanelMode === 'inline') {
    const inlinePanel = await initializeInlinePanel(postElement);
    if (inlinePanel) {
      activePanel = inlinePanel;
    } else {
      activePanelMode = 'sidebar';
    }
  }

  if (activePanelMode === 'sidebar') {
    if (!sidebarPanel) {
      initializeSidebar();
    }
    if (sidebarPanel) {
      setupPanelCallbacks(sidebarPanel);
      activePanel = sidebarPanel;
      sidebarPanel.show();
    }
  }

  if (activePanel) {
    // Seed with last-used filters (session-persistent), or fall back to global defaults
    const seedFilters = lastUsedFilters || {
      tone: userSettings.defaultTone,
      length: userSettings.defaultLength,
      intent: userSettings.defaultIntent,
    };

    activePanel.setState({
      tone: seedFilters.tone as Tone[],
      length: seedFilters.length as Length,
      intent: seedFilters.intent as Intent[],
      error: null,
    });

    await generateComment();
  }
}

/**
 * Global click listener for comment buttons
 */
function setupCommentButtonListener(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;
      const commentButton = target.closest(LINKEDIN_SELECTORS.commentButton);

      if (commentButton) {
        handleCommentButtonClick(commentButton);
      }
    },
    true
  );
}

/**
 * Initialize content script
 */
async function init(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Set up event listeners
  setupCommentButtonListener();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
