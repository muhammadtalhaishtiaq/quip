/**
 * Extension popup - redirects to full settings page
 */

// Get the settings page URL
const settingsUrl = chrome.runtime.getURL('src/settings/settings.html');

// Open settings in new tab
chrome.tabs.create({ url: settingsUrl });

// Close the popup
window.close();

export {};
