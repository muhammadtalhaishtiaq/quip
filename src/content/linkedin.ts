/**
 * Content script for LinkedIn
 * Event-driven approach: intercepts clicks on LinkedIn's native comment button
 * When clicked, extracts post content and activates Quip AI comment generator
 */

import { extractPostData } from './shared/extractor';
import { QuipPanel } from './shared/panel';
import { GenerateOptions, PanelSubmitOptions, PostData, StoredSettings } from './shared/types';
import { LINKEDIN_SELECTORS, QUIP_CLASSES } from './shared/selectors';

console.log('✨ Quip content script loaded on LinkedIn');

let activePanel: { panel: QuipPanel; host: HTMLElement; button: HTMLElement } | null = null;

function closeActivePanel(): void {
  if (!activePanel) return;
  activePanel.panel.close();
  activePanel.button.classList.remove(QUIP_CLASSES.panelOpen);
  activePanel = null;
}

function positionPanel(host: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const top = Math.min(window.innerHeight - 24, rect.bottom + 10);
  const idealLeft = rect.left;
  const maxLeft = Math.max(12, window.innerWidth - 392);
  const left = Math.max(12, Math.min(idealLeft, maxLeft));

  host.style.cssText = `
    position: fixed;
    z-index: 999999;
    top: ${top}px;
    left: ${left}px;
  `;
}

/**
 * Check if user has API key configured
 */
async function hasApiKeyConfigured(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get('quip_settings', (data: Record<string, unknown>) => {
      const settings = data['quip_settings'];
      const hasKey =
        typeof settings === 'object' &&
        settings !== null &&
        !!(settings as { apiKey?: string }).apiKey;
      resolve(hasKey);
    });
  });
}

/**
 * Get user settings
 */
async function getUserSettings(): Promise<StoredSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('quip_settings', (data: Record<string, unknown>) => {
      const defaults: StoredSettings = {
        role: 'Professional',
        defaultTone: ['professional'],
        defaultLength: 'medium',
        defaultIntent: ['agree', 'insight'],
        apiKey: '',
        useEmojis: false,
        mentionAuthor: false,
        formality: 50,
        model: 'gpt-4o-mini',
        provider: 'openai',
      };
      resolve(
        data['quip_settings']
          ? { ...defaults, ...(data['quip_settings'] as Partial<StoredSettings>) }
          : defaults
      );
    });
  });
}

/**
 * Find the post container from the comment button
 * LinkedIn posts are in containers with role="listitem"
 */
function findPostContainerFromButton(button: Element): Element | null {
  let current: Element | null = button;

  // Traverse up to find the post container (role="listitem" or class containing "listitem")
  while (current && current !== document.body) {
    if (current.getAttribute('role') === 'listitem') {
      console.log('[Quip] Found post container via role="listitem"');
      return current;
    }

    // Fallback: check for common post container classes
    const classes = current.className;
    if (
      typeof classes === 'string' &&
      (classes.includes('feed') || classes.includes('update') || classes.includes('post'))
    ) {
      console.log('[Quip] Found post container via class:', classes.substring(0, 50));
      return current;
    }

    current = current.parentElement;
  }

  console.log('[Quip] Could not find post container from comment button');
  return null;
}

/**
 * Handle LinkedIn comment button click
 * This is called when user clicks the native comment button
 */
async function handleCommentButtonClick(button: Element) {
  console.log('[Quip] Comment button clicked!');

  const postElement = findPostContainerFromButton(button);
  if (!postElement) {
    console.error('[Quip] Could not find post container');
    return;
  }

  // Check if user has API key configured
  console.log('[Quip] Checking API key configuration...');
  const hasKey = await hasApiKeyConfigured();
  console.log('[Quip] API key configured:', hasKey);

  if (!hasKey) {
    console.error('[Quip] ❌ No API key configured!');
    // Don't block LinkedIn's native comment action
    return;
  }

  // Extract post data
  console.log('[Quip] Extracting post data from clicked post...');
  const postData = extractPostData(postElement);
  console.log('[Quip] Post data extracted:', {
    text: postData?.text?.substring(0, 100),
    author: postData?.author,
  });

  if (!postData || !postData.text) {
    console.error('[Quip] ❌ Could not extract post content');
    return;
  }

  // Get user settings
  console.log('[Quip] Loading user settings...');
  const userSettings = await getUserSettings();
  console.log('[Quip] User settings loaded:', { role: userSettings.role });

  // Create and show Quip panel
  closeActivePanel();

  const panelHost = document.createElement('div');
  panelHost.className = QUIP_CLASSES.panelHost;
  positionPanel(panelHost, button as HTMLElement);
  document.body.appendChild(panelHost);
  console.log('[Quip] Panel host created and appended to DOM');

  const panel = new QuipPanel(panelHost);
  activePanel = { panel, host: panelHost, button: button as HTMLElement };
  button.classList.add(QUIP_CLASSES.panelOpen);
  console.log('[Quip] Panel instance created and active');

  panel.setState({
    tone: userSettings.defaultTone || ['professional'],
    length: userSettings.defaultLength || 'medium',
    intent: userSettings.defaultIntent || ['agree', 'insight'],
  });

  panel.setOnGenerate(async (options: PanelSubmitOptions) => {
    await generateComment(panel, postData, userSettings, options);
  });

  panel.setOnCopyResult((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  });

  panel.setOnInsertResult(({ text }) => {
    injectCommentToTextarea(postElement, text);
  });
}

/**
 * Generate comment by sending message to service worker
 */
async function generateComment(
  panel: QuipPanel,
  postData: PostData,
  userSettings: StoredSettings,
  panelOptions: PanelSubmitOptions
) {
  try {
    console.log('[Quip] 🚀 GENERATING COMMENT - sending to service worker...');
    panel.setState({ isLoading: true, error: null });

    // Prepare the generate options
    const generateOptions: GenerateOptions = {
      postText: postData.text,
      postAuthor: postData.author,
      tone: panelOptions.tone || userSettings.defaultTone,
      length: panelOptions.length || userSettings.defaultLength,
      intent: panelOptions.intent || userSettings.defaultIntent,
      role: userSettings.role,
      useEmojis: userSettings.useEmojis,
      mentionAuthor: userSettings.mentionAuthor,
      customInstruction: panelOptions.customInstruction,
      excerpt: postData.excerpt,
      formality: userSettings.formality,
    };

    // Send message to service worker
    console.log('[Quip] Sending GENERATE message to service worker with options:', generateOptions);
    const response = await new Promise<{
      status: string;
      data?: { comments?: string[] };
      error?: { message?: string };
    }>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'GENERATE', options: generateOptions },
        (response: { status: string; data?: { comments?: string[] }; error?: { message?: string } }) => {
          console.log('[Quip] Response from service worker:', response);
          if (chrome.runtime.lastError) {
            console.error('[Quip] Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (response?.status === 'success') {
      console.log('[Quip] ✅ Successfully generated comments:', response.data?.comments);
      const generatedComments = response.data?.comments || [];
      panel.setState({
        isLoading: false,
        results: generatedComments,
      });
    } else {
      const errorMsg = response?.error?.message || 'Failed to generate comment';
      console.error('[Quip] ❌ Generation failed:', errorMsg);
      panel.setState({
        isLoading: false,
        error: errorMsg,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[Quip] ❌ Generation error:', error);
    panel.setState({
      isLoading: false,
      error: errorMsg,
    });
  }
}

/**
 * Inject the generated comment into LinkedIn's comment textarea
 */
function injectCommentToTextarea(postElement: Element, commentText: string) {
  // Look for the LinkedIn comment textarea
  const textarea =
    (postElement.querySelector(LINKEDIN_SELECTORS.commentTextarea) ||
      postElement.ownerDocument.querySelector(LINKEDIN_SELECTORS.commentTextarea)) as
      | HTMLTextAreaElement
      | null;

  if (textarea) {
    // Set the value
    textarea.value = commentText;

    // Trigger input event to let LinkedIn know the value changed
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    // Focus and scroll into view
    textarea.focus();
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });

    console.log('[Quip] Comment injected into textarea');
    closeActivePanel();
  } else {
    console.warn('[Quip] Could not find comment textarea');
  }
}

/**
 * Global click listener to intercept LinkedIn comment button clicks
 */
function setupCommentButtonListener(): void {
  console.log('[Quip] Setting up global comment button listener...');

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;

      // Check if clicked element is or contains a comment button
      const commentButton = target.closest(LINKEDIN_SELECTORS.commentButton);

      if (commentButton) {
        console.log('[Quip] ✨ LinkedIn comment button detected!');
        handleCommentButtonClick(commentButton);
      }
    },
    true // Use capture phase to intercept early
  );

  console.log('[Quip] Global comment button listener installed');
}

/**
 * Close panel on outside click
 */
function setupOutsideClickListener(): void {
  document.addEventListener('click', (event) => {
    if (!activePanel) return;
    const path = event.composedPath();
    if (path.includes(activePanel.host) || path.includes(activePanel.button)) {
      return;
    }
    closeActivePanel();
  });
}

/**
 * Initialize content script
 */
async function init(): Promise<void> {
  console.log('[Quip] Initializing content script...');

  // Give LinkedIn time to load the feed
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Set up event listeners
  setupCommentButtonListener();
  setupOutsideClickListener();

  // Handle window resize to reposition panel
  window.addEventListener('resize', () => {
    if (!activePanel) return;
    positionPanel(activePanel.host, activePanel.button);
  });

  console.log('[Quip] Content script initialization complete');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
