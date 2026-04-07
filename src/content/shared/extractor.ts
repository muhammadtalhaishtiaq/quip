/**
 * Post data extraction from LinkedIn DOM
 */

import { PostData } from './types';
import { findPostContainer, LINKEDIN_SELECTORS } from './selectors';

/**
 * Extract post text from a post element
 */
function extractPostText(postElement: Element): string {
  // Try multiple selectors for post text
  let textElement = postElement.querySelector(LINKEDIN_SELECTORS.postText);

  if (!textElement) {
    textElement = postElement.querySelector(LINKEDIN_SELECTORS.postTextStandard);
  }

  if (!textElement) {
    // Try finding expandable text box directly
    textElement = postElement.querySelector('span[data-testid="expandable-text-box"]');
  }

  if (!textElement) {
    // Fallback: get all text from post container
    const tempContainer = postElement.cloneNode(true) as Element;

    // Remove buttons, metadata, etc.
    tempContainer.querySelectorAll('button, nav, [role="navigation"]').forEach((el) => {
      el.remove();
    });

    return (tempContainer.textContent || '').trim().slice(0, 2000);
  }

  return (textElement.textContent || '').trim().slice(0, 2000);
}

/**
 * Extract post author name
 */
function extractPostAuthor(postElement: Element): string {
  // Try to find author name in post metadata
  let authorLink = postElement.querySelector(LINKEDIN_SELECTORS.postAuthorName);

  if (!authorLink) {
    authorLink = postElement.querySelector('a[data-field*="actor"]');
  }

  if (authorLink) {
    const text = (authorLink.textContent || '').trim();
    if (text) return text;
  }

  // Fallback: generic search
  const allLinks = postElement.querySelectorAll('a');
  for (const link of allLinks) {
    const href = link.getAttribute('href') || '';
    if (href.includes('/in/') || href.includes('/company/')) {
      return (link.textContent || '').trim();
    }
  }

  return 'LinkedIn User';
}

/**
 * Extract post excerpt (first few sentences)
 */
function extractPostExcerpt(text: string): string {
  // Get first 2-3 sentences max
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 3).join(' ').slice(0, 400);
}

/**
 * Extract complete post data from LinkedIn post element
 */
export function extractPostData(postElement: Element): PostData {
  const text = extractPostText(postElement);
  const author = extractPostAuthor(postElement);
  const excerpt = extractPostExcerpt(text);

  return {
    text: text || 'Unable to extract post text',
    author: author || 'Unknown Author',
    excerpt: excerpt || text.slice(0, 100),
  };
}

/**
 * Helper: Get post data from any child element of a post
 */
export function getPostDataFromElement(element: Element): PostData | null {
  const postContainer = findPostContainer(element);

  if (!postContainer) {
    return null;
  }

  return extractPostData(postContainer);
}
