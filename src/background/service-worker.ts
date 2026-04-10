/**
 * Service Worker for Quip
 * Handles background tasks and API calls
 */

import { generateComment } from './providers/openai';
import { GenerateMessage, GenerateOptions, StoredSettings } from '../content/shared/types';

/**
 * Get stored settings from chrome.storage.local
 */
function getSettings(): Promise<StoredSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('quip_settings', (data: Record<string, unknown>) => {
      const defaults: StoredSettings = {
        apiKey: '',
        role: 'Professional',
        defaultTone: ['professional'],
        defaultLength: 'medium',
        defaultIntent: ['agree', 'insight'],
        panelMode: 'sidebar',
        useEmojis: false,
        mentionAuthor: false,
        formality: 50,
        model: 'gpt-4o-mini',
        provider: 'openai',
        commenterInterests: '',
        customInstruction: '',
        temperature: 0.75,
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
 * Message listener for content script
 */
chrome.runtime.onMessage.addListener((request: GenerateMessage, _sender, sendResponse) => {
  if (request.type === 'GENERATE') {
    // Handle generate request asynchronously
    handleGenerateRequest(request.options)
      .then((result) => {
        sendResponse({ status: 'success', data: result });
      })
      .catch((error) => {
        sendResponse({
          status: 'error',
          error: { message: error instanceof Error ? error.message : String(error), code: 'GENERATION_ERROR' },
        });
      });

    // Keep connection open for async response
    return true;
  }

  sendResponse({ status: 'error', message: 'Unknown message type' });
  return false;
});

/**
 * Handle GENERATE message from content script
 */
async function handleGenerateRequest(options: GenerateOptions) {
  const settings = await getSettings();

  if (!settings.apiKey) {
    throw {
      code: 'MISSING_API_KEY',
      message: 'OpenAI API key not configured. Please set it in extension settings.',
      timestamp: Date.now(),
    };
  }

  // Respect panel-level controls first, then fall back to saved defaults.
  const optionsWithDefaults = {
    ...options,
    role: options.role || settings.role,
    formality: options.formality ?? settings.formality ?? 50,
    temperature: options.temperature ?? 0.75,
  };

  // Call OpenAI provider
  const result = await generateComment(
    optionsWithDefaults,
    settings.apiKey,
    settings.model || 'gpt-4o-mini'
  );

  return result;
}

export {};
