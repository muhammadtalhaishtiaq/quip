/**
 * Chrome storage wrapper for Quip settings
 */

import { StoredSettings } from '../content/shared/types';

const STORAGE_KEY = 'quip_settings';

const DEFAULT_SETTINGS: StoredSettings = {
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

/**
 * Get stored settings from chrome.storage.local
 * Returns defaults if not found
 */
export async function getSettings(): Promise<StoredSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (data: Record<string, unknown>) => {
      if (data[STORAGE_KEY]) {
        resolve({ ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY] as Partial<StoredSettings>) });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    });
  });
}

/**
 * Save settings to chrome.storage.local
 */
export async function saveSettings(settings: Partial<StoredSettings>): Promise<void> {
  const currentSettings = await getSettings();
  const updated = { ...currentSettings, ...settings };

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Clear all settings and reset to defaults
 */
export async function clearSettings(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(STORAGE_KEY, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Check if API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
  const settings = await getSettings();
  return !!settings.apiKey && settings.apiKey.length > 0;
}
