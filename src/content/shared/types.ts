/**
 * All TypeScript type definitions for Quip
 */

export type Tone = 'professional' | 'friendly' | 'casual' | 'witty' | 'empathetic' | 'humorous' | 'non-robotic' | 'natural';
export type Length = 'crisp' | 'medium' | 'long';
export type Intent =
  | 'agree'
  | 'disagree'
  | 'question'
  | 'insight'
  | 'experience'
  | 'resource'
  | 'gratitude'
  | 'networking'
  | 'humor';
export type Provider = 'openai';
export type PanelMode = 'sidebar' | 'inline';

export interface StoredSettings {
  apiKey: string;
  role: string;
  defaultTone: Tone[];
  defaultLength: Length;
  defaultIntent: Intent[];
  panelMode: PanelMode;
  useEmojis: boolean;
  mentionAuthor: boolean;
  formality: number; // 0-100 slider
  model: string; // 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'
  provider: Provider;
  commenterInterests: string;    // User interests/expertise
  customInstruction: string;     // Global custom prompt
  temperature: number;           // 0.2-1.1 creativity control
}

export interface GenerateOptions {
  postText: string;
  postAuthor: string;
  excerpt: string;
  tone: Tone[];
  length: Length;
  intent: Intent[];
  role: string;
  commenterInterests?: string;
  useEmojis: boolean;
  mentionAuthor: boolean;
  formality: number;
  temperature?: number;
  customInstruction?: string;
}

export interface PanelSubmitOptions {
  tone: Tone[];
  length: Length;
  intent: Intent[];
  customInstruction: string;
}

export interface PanelResultAction {
  index: number;
  text: string;
}

export interface GenerateResult {
  comments: string[];
  model: string;
  tokensUsed: number;
}

export interface GenerateError {
  code: string;
  message: string;
  timestamp: number;
}

export interface GenerateMessage {
  type: 'GENERATE';
  options: GenerateOptions;
}

export interface PostData {
  text: string;
  author: string;
  excerpt: string;
}

export interface PanelState {
  tone: Tone[];
  length: Length;
  intent: Intent[];
  isLoading: boolean;
  results: string[];
  error: string | null;
}
