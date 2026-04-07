/**
 * Service Worker for Quip
 * Handles background tasks and API calls
 */

import { generateComment } from './providers/openai';
import { GenerateMessage, GenerateOptions, StoredSettings } from '../content/shared/types';

console.log('✨ Quip Service Worker started');
console.log('[Service Worker] Ready to receive messages from content script');

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
 * Message listener for content script
 */
chrome.runtime.onMessage.addListener((request: GenerateMessage, sender, sendResponse) => {
  console.log('[Service Worker] 📨 Received message:', request.type);
  console.log('[Service Worker] Message from:', sender.url);

  if (request.type === 'GENERATE') {
    console.log('[Service Worker] 🚀 Starting generation with options:', request.options);
    // Handle generate request asynchronously
    handleGenerateRequest(request.options)
      .then((result) => {
        console.log('[Service Worker] ✅ Generation success');
        console.log('[Service Worker] Result:', result);
        sendResponse({ status: 'success', data: result });
      })
      .catch((error) => {
        console.error('[Service Worker] ❌ Generation error:', error);
        sendResponse({
          status: 'error',
          error: { message: error instanceof Error ? error.message : String(error), code: 'GENERATION_ERROR' },
        });
      });

    // Keep connection open for async response
    return true;
  }

  console.warn('[Service Worker] Unknown message type:', request.type);
  sendResponse({ status: 'error', message: 'Unknown message type' });
  return false;
});

/**
 * Handle GENERATE message from content script
 */
async function handleGenerateRequest(options: GenerateOptions) {
  try {
    console.log('[Service Worker] Loading settings...');
    const settings = await getSettings();
    console.log('[Service Worker] Settings loaded: role =', settings.role);

    if (!settings.apiKey) {
      console.error('[Service Worker] ❌ No API key configured!');
      throw {
        code: 'MISSING_API_KEY',
        message: 'OpenAI API key not configured. Please set it in extension settings.',
        timestamp: Date.now(),
      };
    }
    console.log('[Service Worker] ✅ API key found');

    // Add formality level from settings if available
    const optionsWithFormality = {
      ...options,
      formality: settings.formality || 50,
    };

    console.log('[Service Worker] Calling OpenAI API with model:', settings.model || 'gpt-4o-mini');
    // Call OpenAI provider
    const result = await generateComment(
      optionsWithFormality,
      settings.apiKey,
      settings.model || 'gpt-4o-mini'
    );

    console.log('[Service Worker] ✅ OpenAI API response received:', result);
    return result;
  } catch (error) {
    console.error('[Service Worker] ❌ Error in handleGenerateRequest:', error);
    throw error;
  }
}

export {};
