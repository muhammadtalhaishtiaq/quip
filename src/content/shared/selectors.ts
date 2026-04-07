/**
 * LinkedIn DOM selectors for Quip
 */

export const LINKEDIN_SELECTORS = {
  // Post containers - LinkedIn uses data attributes for posts
  feedContainer: 'main[role="main"], .scaffold-layout__main',
  postContainer: '[data-id]', // Posts have data-id attributes
  postItem: 'div[role="listitem"]', // LinkedIn posts are marked with role="listitem"

  // Comment/reaction section - where the comment button is located
  actionBar:
    '.feed-shared-social-action-bar, .update-v2-social-activity, .social-actions, .feed-shared-social-action-bar__action-button',
  reactionsContainer: '.social-details-social-counts',
  commentButton: 'button:has(svg#comment-small), button[aria-label*="Comment" i]',
  reactionItems: '.social-details-social-counts__item',

  // Post content
  postText: '.update-components-text__content, span[data-testid="expandable-text-box"]',
  postTextStandard: '[data-testid="update-components-text"]',
  postAuthor: '.feed-item__actor__meta-list a',
  postAuthorName: 'a[data-field="actor.profile.actions"]',

  // Comment box/textarea (opened by LinkedIn's native button)
  commentTextarea: 'textarea[aria-label*="Comment" i], div[contenteditable="true"][role="textbox"]',
  commentContainer: 'div[contenteditable="true"][data-testid*="comment"]',

  // Generic post identifier
  feedItemContainer: '.feed-item',
  activityItem: 'div[role="listitem"]',
};

export const QUIP_CLASSES = {
  injectedButton: 'quip-inject-button',
  injectedPanel: 'quip-inject-panel',
  panelHost: 'quip-panel-host',
  panelOpen: 'quip-panel-open',
  actionSlot: 'quip-action-slot',
};

export const QUIP_IDS = {
  panelRoot: 'quip-panel-root',
  panelContainer: 'quip-panel-container',
};

/**
 * Check if an element is a visible post on the feed
 */
export function isVisiblePost(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

/**
 * Find the nearest post container from a given element
 */
export function findPostContainer(element: Element): Element | null {
  let current: Element | null = element;

  while (current && current !== document.body) {
    // Check for activity URN
    if (current.getAttribute('data-urn')?.includes('urn:li:activity')) {
      return current;
    }

    // Check for generic post container
    if (current.classList.contains('feed-item')) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}
