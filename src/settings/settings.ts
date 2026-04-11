/**
 * Full-page settings logic for Quip
 */

import { getSettings, saveSettings, clearSettings } from '../shared/storage';
import { Intent, Length, PanelMode, Tone } from '../content/shared/types';

const settingsForm = document.getElementById('settingsForm') as HTMLFormElement;
const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const roleSelect = document.getElementById('role') as HTMLSelectElement;
const customRoleGroup = document.getElementById('customRoleGroup') as HTMLDivElement;
const customRoleInput = document.getElementById('customRole') as HTMLInputElement;

const PRESET_ROLES = new Set([
  'Product Manager',
  'Founder',
  'Engineer',
  'Designer',
  'Marketer',
  'Investor',
  'Job Seeker',
  'Student',
]);

function updateCustomRoleVisibility(): void {
  const isOther = roleSelect.value === 'Other';
  customRoleGroup.style.display = isOther ? 'block' : 'none';
  customRoleInput.required = isOther;
}

// ═════════════════════════════════════ SECTION NAVIGATION ═════════════════════════════════════

function initializeSectionNavigation(): void {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const sectionName = item.getAttribute('data-section');

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active section
      sections.forEach((section) => section.classList.remove('active'));
      const activeSection = document.querySelector(
        `.content-section[data-section="${sectionName}"]`
      );
      if (activeSection) {
        activeSection.classList.add('active');
      }
    });
  });
}

// ═════════════════════════════════════ SLIDER DISPLAY ═════════════════════════════════════

function updateSliderDisplay(sliderId: string): void {
  const slider = document.getElementById(sliderId) as HTMLInputElement;
  const display = document.getElementById(sliderId + 'Value') as HTMLElement;

  if (slider && display) {
    if (sliderId === 'temperature') {
      display.textContent = parseFloat(slider.value).toFixed(2);
    } else if (sliderId === 'formality') {
      display.textContent = slider.value;
    }
  }
}

// ═════════════════════════════════════ LOAD SETTINGS ═════════════════════════════════════

async function loadSettings(): Promise<void> {
  const settings = await getSettings();

  // Profile Section
  if (PRESET_ROLES.has(settings.role)) {
    roleSelect.value = settings.role;
    customRoleInput.value = '';
  } else {
    roleSelect.value = 'Other';
    customRoleInput.value = settings.role || '';
  }
  updateCustomRoleVisibility();
  (document.getElementById('apiKey') as HTMLInputElement).value = settings.apiKey;
  (document.getElementById('commenterInterests') as HTMLTextAreaElement).value =
    settings.commenterInterests || '';

  // Voice Section
  (document.getElementById('formality') as HTMLInputElement).value = String(settings.formality ?? 50);
  (document.getElementById('temperature') as HTMLInputElement).value = String(
    settings.temperature ?? 0.75
  );
  (document.getElementById('customInstruction') as HTMLTextAreaElement).value =
    settings.customInstruction || '';

  // Update slider displays
  updateSliderDisplay('formality');
  updateSliderDisplay('temperature');

  // Parameters Section - Tones
  settings.defaultTone.forEach((tone: Tone) => {
    const checkbox = document.getElementById(`tone-${tone}`) as HTMLInputElement;
    if (checkbox) checkbox.checked = true;
  });

  // Parameters Section - Length
  const lengthRadio = document.querySelector(
    `input[name="length"][value="${settings.defaultLength}"]`
  ) as HTMLInputElement;
  if (lengthRadio) lengthRadio.checked = true;

  // Parameters Section - Intent
  settings.defaultIntent.forEach((intent: Intent) => {
    const checkbox = document.getElementById(`intent-${intent}`) as HTMLInputElement;
    if (checkbox) checkbox.checked = true;
  });

  // Model Section
  (document.getElementById('model') as HTMLSelectElement).value = settings.model;
  (document.getElementById('panelMode') as HTMLSelectElement).value = settings.panelMode || 'sidebar';
}

// ═════════════════════════════════════ SAVE SETTINGS ═════════════════════════════════════

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveAllSettings();
});

async function saveAllSettings(): Promise<void> {
  try {
    // Collect form data
    const selectedRole = roleSelect.value;
    const customRole = customRoleInput.value.trim();
    const role = selectedRole === 'Other' ? customRole : selectedRole;
    if (!role) {
      showStatus(null, '⚠️ Please enter your custom role', 'warning');
      return;
    }
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
    const commenterInterests = (document.getElementById('commenterInterests') as HTMLTextAreaElement)
      .value;
    const formality = Number((document.getElementById('formality') as HTMLInputElement).value);
    const temperature = Number((document.getElementById('temperature') as HTMLInputElement).value);
    const customInstruction = (document.getElementById('customInstruction') as HTMLTextAreaElement)
      .value;
    const model = (document.getElementById('model') as HTMLSelectElement).value;
    const panelMode = (document.getElementById('panelMode') as HTMLSelectElement).value as PanelMode;

    // Collect tones
    const tones = Array.from(document.querySelectorAll('input[name^="tone-"]:checked')).map(
      (el) => (el as HTMLInputElement).value as Tone
    );

    // Collect length
    const length = (
      document.querySelector('input[name="length"]:checked') as HTMLInputElement
    ).value as Length;

    // Collect intents
    const intents = Array.from(document.querySelectorAll('input[name^="intent-"]:checked')).map(
      (el) => (el as HTMLInputElement).value as Intent
    );

    // Save to storage
    await saveSettings({
      role,
      apiKey,
      commenterInterests,
      formality,
      temperature,
      customInstruction,
      useEmojis: false,
      mentionAuthor: false,
      model,
      panelMode,
      defaultTone: tones.length > 0 ? tones : ['professional'],
      defaultLength: length || 'medium',
      defaultIntent: intents.length > 0 ? intents : ['agree', 'insight'],
      provider: 'openai',
    });

    showStatus(null, 'Settings saved successfully!', 'success');
  } catch (error) {
    showStatus(null, 'Failed to save settings', 'error');
  }
}

// ═════════════════════════════════════ TEST API CONNECTION ═════════════════════════════════════

testBtn.addEventListener('click', async () => {
  const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;

  if (!apiKey) {
    showStatus(null, '⚠️ Please enter an API key first', 'warning');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = '🔄 Testing...';

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      showStatus(null, ' API key is valid!', 'success');
    } else if (response.status === 401) {
      showStatus(null, '❌ Invalid API key - authentication failed', 'error');
    } else {
      showStatus(null, `❌ API error: ${response.status}`, 'error');
    }
  } catch (error) {
    showStatus(null, '❌ Network error - check your connection', 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🔗 Test Connection';
  }
});

// ═════════════════════════════════════ CLEAR DATA ═════════════════════════════════════

clearBtn.addEventListener('click', async () => {
  if (confirm('⚠️ Are you sure? This will clear all Quip settings. This cannot be undone.')) {
    try {
      await clearSettings();
      settingsForm.reset();
      await loadSettings();
      showStatus(null, ' All data cleared', 'success');
    } catch (error) {
      showStatus(null, '❌ Failed to clear data', 'error');
    }
  }
});

// ═════════════════════════════════════ SLIDER LISTENERS ═════════════════════════════════════

const formalitySlider = document.getElementById('formality') as HTMLInputElement;
if (formalitySlider) {
  formalitySlider.addEventListener('input', () => {
    updateSliderDisplay('formality');
  });
}

const temperatureSlider = document.getElementById('temperature') as HTMLInputElement;
if (temperatureSlider) {
  temperatureSlider.addEventListener('input', () => {
    updateSliderDisplay('temperature');
  });
}

roleSelect.addEventListener('change', () => {
  updateCustomRoleVisibility();
});

// ═════════════════════════════════════ TOASTER NOTIFICATIONS ═════════════════════════════════════

function showStatus(
  _element: HTMLDivElement | null,
  message: string,
  type: 'success' | 'error' | 'warning'
): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Icon mapping
  const icons: Record<string, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
  `;

  // Add to container
  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ═════════════════════════════════════ INITIALIZATION ═════════════════════════════════════

initializeSectionNavigation();
loadSettings();

export {};
