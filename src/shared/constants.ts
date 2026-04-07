/**
 * Global constants for Quip
 */

export const EXTENSION_NAME = 'Quip';
export const EXTENSION_VERSION = '1.0.0';

export const ROLE_OPTIONS = [
  'Product Manager',
  'Founder',
  'Job Seeker',
  'Marketer',
  'Engineer',
  'Designer',
  'Investor',
  'Student',
  'Other',
];

export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Business-relevant and credible' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'witty', label: 'Witty', description: 'Clever and humorous' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive' },
  { value: 'humorous', label: 'Humorous', description: 'Funny and light-hearted' },
];

export const LENGTH_OPTIONS = [
  { value: 'crisp', label: 'Crisp', description: '1–2 sentences' },
  { value: 'medium', label: 'Medium', description: '3–4 sentences' },
  { value: 'long', label: 'Long', description: '5+ sentences' },
];

export const INTENT_OPTIONS = [
  { value: 'agree', label: 'Agree & Add Insight', description: 'Show agreement + add value' },
  {
    value: 'disagree',
    label: 'Disagree Respectfully',
    description: 'Polite counterpoint',
  },
  { value: 'question', label: 'Ask Question', description: 'Engage with follow-up' },
  { value: 'insight', label: 'Share Insight', description: 'Add relevant knowledge' },
  { value: 'experience', label: 'Share Experience', description: 'Relate personal story' },
  { value: 'resource', label: 'Share Resource', description: 'Recommend tool/article' },
  { value: 'gratitude', label: 'Show Gratitude', description: 'Thank or appreciate' },
  { value: 'networking', label: 'Network', description: 'Build relationship' },
  { value: 'humor', label: 'Add Humor', description: 'Make a joke' },
];

export const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'Fast & Cheap (Recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o', note: 'Most Capable' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', note: 'Budget' },
];

export const LINKEDIN_SELECTORS = {
  postContainer: '[data-urn*="urn:li:activity"]',
  commentButton: '.social-details-social-counts__item [aria-label*="Comment"]',
  commentBox: 'div[data-testid*="comment"] textarea',
  postText: '.feed-item__part-size-responsive',
  postAuthor: 'a[data-field="actor.profile.actions"]',
};

export const OPENAI_API_URL = 'https://api.openai.com/v1';
export const OPENAI_MODEL_ENDPOINT = '/models';
export const OPENAI_CHAT_ENDPOINT = '/chat/completions';

export const MESSAGE_TIMEOUT = 30000; // 30 seconds
export const PANEL_ANIMATION_DURATION = 300; // ms
export const SKELETON_LOADER_DURATION = 3000; // 3 seconds

export const Z_INDEX = {
  panel: 999999,
  modal: 999998,
  loader: 999997,
};
