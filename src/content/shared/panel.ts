/**
 * QuipPanel: Collapsible sidebar with full controls and suggestion results
 * Design: Minimized tab on right edge, expandable to full control panel
 */

import { Tone, Length, Intent, PanelMode, PanelResultAction, PanelState } from './types';

export class QuipPanel {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private state: PanelState;
  private mode: PanelMode;
  private isExpanded: boolean = true;
  private onGenerate: (() => Promise<void>) | null = null;
  private onInsertResult: ((action: PanelResultAction) => void) | null = null;
  private onCopyResult: ((text: string) => void) | null = null;
  private onStateChange: ((state: Partial<PanelState>) => void) | null = null;

  private applyHostLayout(): void {
    if (this.mode === 'inline') {
      this.host.style.position = 'relative';
      this.host.style.top = 'auto';
      this.host.style.right = 'auto';
      this.host.style.width = '100%';
      this.host.style.height = 'auto';
      this.host.style.background = 'transparent';
      this.host.style.boxShadow = 'none';
      this.host.style.overflow = 'visible';
      return;
    }

    if (this.isExpanded) {
      this.host.style.top = '0';
      this.host.style.right = '0';
      this.host.style.width = '360px';
      this.host.style.height = '100vh';
      this.host.style.background = 'white';
      this.host.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
      this.host.style.overflow = 'hidden';
    } else {
      this.host.style.top = '72px';
      this.host.style.right = '16px';
      this.host.style.width = 'auto';
      this.host.style.height = 'auto';
      this.host.style.background = 'transparent';
      this.host.style.boxShadow = 'none';
      this.host.style.overflow = 'visible';
    }
  }

  constructor(host: HTMLElement, mode: PanelMode = 'sidebar') {
    this.host = host;
    this.mode = mode;
    this.shadow = host.attachShadow({ mode: 'closed' });

    this.state = {
      tone: ['professional'],
      length: 'medium',
      intent: ['agree', 'insight'],
      isLoading: false,
      results: [],
      error: null,
    };

    this.applyHostLayout();
    this.render();
  }

  setState(updates: Partial<PanelState>): void {
    this.state = { ...this.state, ...updates };
    if (this.onStateChange) {
      this.onStateChange(updates);
    }
    this.render();
  }

  setOnGenerate(callback: () => Promise<void>): void {
    this.onGenerate = callback;
  }

  setOnInsertResult(callback: (action: PanelResultAction) => void): void {
    this.onInsertResult = callback;
  }

  setOnCopyResult(callback: (text: string) => void): void {
    this.onCopyResult = callback;
  }

  setOnStateChange(callback: (state: Partial<PanelState>) => void): void {
    this.onStateChange = callback;
  }

  getState(): PanelState {
    return { ...this.state };
  }

  show(): void {
    this.host.style.display = 'block';
  }

  hide(): void {
    this.host.style.display = 'none';
  }

  close(): void {
    this.hide();
  }

  private toggleExpanded(): void {
    if (this.mode === 'inline') {
      return;
    }
    this.isExpanded = !this.isExpanded;
    this.applyHostLayout();
    this.render();
  }

  private renderToneSelector(): string {
    const tones: Tone[] = ['professional', 'friendly', 'casual', 'witty', 'empathetic', 'humorous', 'non-robotic', 'natural'];
    return `
      <div class="control-section">
        <label class="section-label">Tone</label>
        <div class="tone-buttons">
          ${tones
            .map(
              (tone) => `
            <button 
              class="tone-btn ${this.state.tone.includes(tone) ? 'active' : ''}"
              data-tone="${tone}"
              title="${tone.charAt(0).toUpperCase() + tone.slice(1)}"
            >
              ${tone.charAt(0).toUpperCase() + tone.slice(1)}
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderLengthSelector(): string {
    return `
      <div class="control-section">
        <label class="section-label">Length</label>
        <div class="length-buttons">
          ${(['crisp', 'medium', 'long'] as Length[])
            .map(
              (length) => `
            <button 
              class="length-btn ${this.state.length === length ? 'active' : ''}"
              data-length="${length}"
            >
              ${length.charAt(0).toUpperCase() + length.slice(1)}
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderIntentSelector(): string {
    const intents: Intent[] = [
      'agree',
      'disagree',
      'question',
      'insight',
      'experience',
      'resource',
      'gratitude',
      'networking',
      'humor',
    ];
    return `
      <div class="control-section">
        <label class="section-label">Intent</label>
        <div class="intent-checkboxes">
          ${intents
            .map(
              (intent) => `
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="intent-check"
                data-intent="${intent}"
                ${this.state.intent.includes(intent) ? 'checked' : ''}
              />
              <span>${intent.charAt(0).toUpperCase() + intent.slice(1)}</span>
            </label>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderResultItem(text: string, index: number): string {
    return `
      <div class="result-item">
        <div class="result-number">Generated Comment</div>
        <div class="result-text">${this.sanitizeHtml(text)}</div>
        <div class="result-buttons">
          <button class="copy-btn" data-index="${index}" title="Copy to clipboard">
            Copy
          </button>
        </div>
      </div>
    `;
  }

  private sanitizeHtml(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  private renderControlPanel(): string {
    return `
      <div class="control-panel">
        ${this.renderToneSelector()}
        ${this.renderLengthSelector()}
        ${this.renderIntentSelector()}
        <button class="generate-btn" ${this.state.isLoading ? 'disabled' : ''}>
          ${this.state.isLoading ? '⏳ Generating...' : 'Generate'}
        </button>
      </div>
    `;
  }

  private renderResults(): string {
    if (this.state.isLoading) {
      return `
        <div class="results-section">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Generating suggestions...</p>
          </div>
        </div>
      `;
    }

    if (this.state.error) {
      return `
        <div class="results-section error-state">
          <div class="error-icon">⚠️</div>
          <p class="error-message">${this.sanitizeHtml(this.state.error)}</p>
          <button class="retry-btn">Try Again</button>
        </div>
      `;
    }

    if (this.state.results.length === 0) {
      return `
        <div class="results-section empty-state">
          <div class="empty-icon">💭</div>
          <p>Click "Generate" to create AI comment suggestions!</p>
        </div>
      `;
    }

    return `
      <div class="results-section">
        <div class="results-list">
          ${this.state.results.map((text, idx) => this.renderResultItem(text, idx)).join('')}
        </div>
      </div>
    `;
  }

  private renderCollapsedTab(): string {
    return `
      <button class="collapsed-tab" title="Open Quip comments panel">
        <span class="tab-label">Quip Comments</span>
      </button>
    `;
  }

  private renderExpandedPanel(): string {
    return `
      <div class="expanded-panel ${this.mode === 'inline' ? 'inline' : ''}">
        <div class="panel-header">
          <h3 class="panel-title">Quip</h3>
          ${
            this.mode === 'sidebar'
              ? `
          <button class="collapse-btn" title="Collapse sidebar">
            ❮
          </button>
          `
              : ''
          }
        </div>
        ${this.renderControlPanel()}
        ${this.renderResults()}
      </div>
    `;
  }

  private getStyles(): string {
    return `
      :host {
        --sage-600: #6B5751;
        --sage-700: #5a4844;
        --emerald-500: #10B981;
        --emerald-600: #059669;
        --amber-400: #FBBF24;
        --gray-100: #F3F4F6;
        --gray-50: #F9FAFB;
        --gray-200: #E5E7EB;
        --gray-300: #D1D5DB;
        --gray-600: #4B5563;
        --gray-700: #374151;
        --red-500: #EF4444;
        --red-600: #DC2626;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .collapsed-tab {
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 14px;
        background: linear-gradient(180deg, #f3faf7 0%, #e9f7f1 100%);
        border: 1px solid #99e0c1;
        border-radius: 999px;
        color: #065f46;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 6px 18px rgba(16, 185, 129, 0.25);
      }

      .collapsed-tab:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(16, 185, 129, 0.3);
      }

      .tab-icon {
        font-size: 16px;
        line-height: 1;
      }

      .tab-label {
        line-height: 1;
      }

      .expanded-panel {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: white;
        border-left: 1px solid var(--gray-200);
        overflow: hidden;
      }

      .expanded-panel.inline {
        height: auto;
        max-height: min(72vh, 640px);
        border: 1px solid var(--gray-200);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        overflow: hidden;
      }

      .expanded-panel.inline .control-panel {
        max-height: none;
      }

      .expanded-panel.inline .results-section {
        max-height: 280px;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--gray-200);
        background: var(--gray-100);
        flex-shrink: 0;
      }

      .panel-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--sage-700);
        margin: 0;
      }

      .collapse-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .collapse-btn:hover {
        background: var(--gray-300);
      }

      .control-panel {
        flex: 0 0 auto;
        padding: 12px;
        border-bottom: 1px solid var(--gray-200);
        overflow-y: auto;
        max-height: 45%;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .control-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .section-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--gray-700);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .tone-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .tone-btn,
      .length-btn {
        padding: 6px 10px;
        border: 1px solid var(--gray-300);
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
        min-width: 86px;
      }

      .tone-btn:hover,
      .length-btn:hover {
        border-color: var(--sage-600);
      }

      .tone-btn.active,
      .length-btn.active {
        background: var(--emerald-500);
        color: white;
        border-color: var(--emerald-600);
      }

      .length-buttons {
        display: flex;
        gap: 6px;
      }

      .intent-checkboxes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 12px;
        padding: 4px;
        border-radius: 3px;
        transition: background 0.2s;
      }

      .checkbox-label:hover {
        background: var(--gray-100);
      }

      .checkbox-label input {
        cursor: pointer;
        width: 14px;
        height: 14px;
        accent-color: var(--emerald-500);
      }

      .checkbox-label span {
        color: var(--gray-700);
        user-select: none;
      }

      .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .slider-value {
        font-size: 12px;
        font-weight: 600;
        color: var(--emerald-600);
      }

      .generate-btn {
        width: 100%;
        padding: 10px;
        background: var(--emerald-500);
        color: white;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 4px;
      }

      .generate-btn:hover:not(:disabled) {
        background: var(--emerald-600);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }

      .generate-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .results-section {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .results-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .result-item {
        padding: 10px;
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .result-number {
        font-size: 11px;
        font-weight: 600;
        color: var(--sage-600);
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .result-text {
        font-size: 12px;
        line-height: 1.4;
        color: var(--gray-700);
        word-wrap: break-word;
        white-space: pre-wrap;
      }

      .result-buttons {
        display: flex;
        gap: 6px;
      }

      .copy-btn,
      .use-btn {
        flex: 1;
        padding: 6px 8px;
        border: 1px solid var(--gray-300);
        background: white;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .copy-btn {
        color: var(--gray-600);
      }

      .copy-btn:hover {
        background: var(--gray-100);
        border-color: var(--gray-400);
      }

      .use-btn {
        background: var(--emerald-500);
        color: white;
        border-color: var(--emerald-600);
      }

      .use-btn:hover {
        background: var(--emerald-600);
        border-color: var(--emerald-700);
      }

      .empty-state,
      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        text-align: center;
      }

      .empty-icon,
      .error-icon {
        font-size: 32px;
      }

      .empty-state p,
      .error-message {
        font-size: 12px;
        color: var(--gray-600);
      }

      .retry-btn {
        padding: 6px 12px;
        background: var(--emerald-500);
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-top: 4px;
      }

      .retry-btn:hover {
        background: var(--emerald-600);
      }

      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 20px;
      }

      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid var(--gray-200);
        border-top-color: var(--emerald-500);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-spinner p {
        font-size: 12px;
        color: var(--gray-600);
      }
    `;
  }

  private render(): void {
    const shouldRenderExpanded = this.mode === 'inline' ? true : this.isExpanded;
    const html = shouldRenderExpanded ? this.renderExpandedPanel() : this.renderCollapsedTab();
    const styles = this.getStyles();

    this.shadow.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Collapsed tab click
    const collapsedTab = this.shadow.querySelector('.collapsed-tab');
    if (collapsedTab) {
      collapsedTab.addEventListener('click', () => this.toggleExpanded());
    }

    // Collapse button
    const collapseBtn = this.shadow.querySelector('.collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggleExpanded());
    }

    // Tone buttons
    this.shadow.querySelectorAll('.tone-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tone = btn.getAttribute('data-tone') as Tone;
        const currentTones = this.state.tone;
        const newTones = currentTones.includes(tone)
          ? currentTones.filter((t) => t !== tone)
          : [...currentTones, tone];
        this.setState({ tone: newTones.length > 0 ? newTones : ['professional'] });
      });
    });

    // Length buttons
    this.shadow.querySelectorAll('.length-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const length = btn.getAttribute('data-length') as Length;
        this.setState({ length });
      });
    });

    // Intent checkboxes
    this.shadow.querySelectorAll('.intent-check').forEach((check) => {
      check.addEventListener('change', () => {
        const intent = (check as HTMLInputElement).getAttribute('data-intent') as Intent;
        const newIntents = (check as HTMLInputElement).checked
          ? [...this.state.intent, intent]
          : this.state.intent.filter((i) => i !== intent);
        this.setState({ intent: newIntents });
      });
    });

    // Generate button
    const generateBtn = this.shadow.querySelector('.generate-btn');
    if (generateBtn && !this.state.isLoading) {
      generateBtn.addEventListener('click', async () => {
        if (this.onGenerate) {
          await this.onGenerate();
        }
      });
    }

    // Copy buttons
    this.shadow.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index') || '0', 10);
        const text = this.state.results[index];
        if (text && this.onCopyResult) {
          this.onCopyResult(text);
        }
      });
    });

    // Use buttons
    this.shadow.querySelectorAll('.use-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index') || '0', 10);
        const text = this.state.results[index];
        if (text && this.onInsertResult) {
          this.onInsertResult({ index, text });
        }
      });
    });

    // Retry button
    const retryBtn = this.shadow.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', async () => {
        if (this.onGenerate) {
          await this.onGenerate();
        }
      });
    }
  }
}
