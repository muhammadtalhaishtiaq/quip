/**
 * Popup logic
 */

import { getSettings, saveSettings, clearSettings } from '../shared/storage';
import { Intent, Length, Tone } from '../content/shared/types';

const form = document.getElementById('quipForm') as HTMLFormElement;
const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const saveStatus = document.getElementById('saveStatus') as HTMLDivElement;
const testStatus = document.getElementById('testStatus') as HTMLDivElement;

/**
 * Load settings on popup open
 */
async function loadSettings() {
  const settings = await getSettings();

  // Fill form with saved settings
  (document.getElementById('role') as HTMLSelectElement).value = settings.role;
  (document.getElementById('apiKey') as HTMLInputElement).value = settings.apiKey;
  (document.getElementById('model') as HTMLSelectElement).value = settings.model;
  (document.getElementById('useEmojis') as HTMLInputElement).checked = settings.useEmojis;
  (document.getElementById('mentionAuthor') as HTMLInputElement).checked = settings.mentionAuthor;
  (document.getElementById('formality') as HTMLInputElement).value = String(settings.formality);

  // Load tone checkboxes
  settings.defaultTone.forEach((tone: Tone) => {
    const checkbox = document.getElementById(`tone-${tone}`) as HTMLInputElement;
    if (checkbox) checkbox.checked = true;
  });

  // Load length radio
  const lengthRadio = document.querySelector(
    `input[name="length"][value="${settings.defaultLength}"]`
  ) as HTMLInputElement;
  if (lengthRadio) lengthRadio.checked = true;

  // Load intent checkboxes
  settings.defaultIntent.forEach((intent: Intent) => {
    const checkbox = document.getElementById(`intent-${intent}`) as HTMLInputElement;
    if (checkbox) checkbox.checked = true;
  });
}

/**
 * Save settings on form submit
 */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect form data
  const role = (document.getElementById('role') as HTMLSelectElement).value;
  const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
  const model = (document.getElementById('model') as HTMLSelectElement).value;
  const useEmojis = (document.getElementById('useEmojis') as HTMLInputElement).checked;
  const mentionAuthor = (document.getElementById('mentionAuthor') as HTMLInputElement).checked;
  const formality = Number((document.getElementById('formality') as HTMLInputElement).value);

  const tones = Array.from(document.querySelectorAll('input[name^="tone-"]:checked')).map(
    (el) => (el as HTMLInputElement).value as Tone
  );

  const length = (
    document.querySelector('input[name="length"]:checked') as HTMLInputElement
  ).value as Length;

  const intents = Array.from(document.querySelectorAll('input[name^="intent-"]:checked')).map(
    (el) => (el as HTMLInputElement).value as Intent
  );

  // Save to storage
  try {
    await saveSettings({
      role,
      apiKey,
      model,
      defaultTone: tones,
      defaultLength: length,
      defaultIntent: intents,
      useEmojis,
      mentionAuthor,
      formality,
    });

    showStatus(saveStatus, '✅ Settings saved!', 'success');
  } catch (error) {
    showStatus(saveStatus, '❌ Failed to save settings', 'error');
  }
});

/**
 * Test API connection
 */
testBtn.addEventListener('click', async () => {
  const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;

  if (!apiKey) {
    showStatus(testStatus, '⚠️ Please enter an API key', 'warning');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';
  testBtn.classList.add('loading');

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      showStatus(testStatus, '✅ API key is valid!', 'success');
    } else {
      showStatus(testStatus, '❌ Invalid API key', 'error');
    }
  } catch (error) {
    showStatus(testStatus, '❌ Network error', 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
    testBtn.classList.remove('loading');
  }
});

/**
 * Clear data
 */
clearBtn.addEventListener('click', async () => {
  if (confirm('Are you sure? This will clear all Quip settings.')) {
    try {
      await clearSettings();
      form.reset();
      showStatus(saveStatus, '✅ Data cleared', 'success');
      loadSettings();
    } catch (error) {
      showStatus(saveStatus, '❌ Failed to clear data', 'error');
    }
  }
});

/**
 * Show status message
 */
function showStatus(
  element: HTMLDivElement,
  message: string,
  type: 'success' | 'error' | 'warning'
) {
  element.className = `status-indicator ${type}`;
  element.textContent = message;

  setTimeout(() => {
    element.textContent = '';
  }, 3000);
}

// Load settings when popup opens
loadSettings();

export {};
