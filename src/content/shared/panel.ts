/**
 * Panel UI for Quip - rendered in Shadow DOM
 * Vanilla TypeScript with Tailwind CSS styles injected as string
 */

import { PanelResultAction, PanelState, Intent, Length, PanelSubmitOptions, Tone } from './types';
import { INTENT_OPTIONS, TONE_OPTIONS, LENGTH_OPTIONS } from '../../shared/constants';

export class QuipPanel {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private state: PanelState = {
    tone: [],
    length: 'medium',
    intent: [],
    isLoading: false,
    results: [],
    error: null,
    customModify: '',
  };

  private onGenerate: (options: PanelSubmitOptions) => void = () => {};
  private onCopyResult: (text: string) => void = () => {};
  private onInsertResult: (result: PanelResultAction) => void = () => {};

  constructor(hostElement: HTMLElement) {
    this.host = hostElement;
    this.shadow = hostElement.attachShadow({ mode: 'closed' });
    this.render();
  }

  /**
   * Set callback for when user clicks Generate
   */
  setOnGenerate(callback: (options: PanelSubmitOptions) => void) {
    this.onGenerate = callback;
  }

  /**
   * Set callback for when user copies a result
   */
  setOnCopyResult(callback: (text: string) => void) {
    this.onCopyResult = callback;
  }

  setOnInsertResult(callback: (result: PanelResultAction) => void) {
    this.onInsertResult = callback;
  }

  /**
   * Update panel state
   */
  setState(updates: Partial<PanelState>) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  /**
   * Get current panel state
   */
  getState(): PanelState {
    return { ...this.state };
  }

  /**
   * Main render function
   */
  private render() {
    this.shadow.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Build HTML for panel
   */
  private getHTML(): string {
    const html = `
      <style>
        :host {
          --sage-600: #6B5751;
          --amber-400: #FBBF24;
          --emerald-500: #10B981;
          --slate-900: #0F172A;
          --slate-100: #F1F5F9;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .panel-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          width: 380px;
          max-width: min(380px, calc(100vw - 24px));
          max-height: 600px;
          overflow-y: auto;
          animate: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel-header {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--slate-900);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .panel-title-icon {
          font-size: 18px;
        }

        .panel-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          line-height: 1;
        }

        .panel-close:hover {
          color: var(--slate-900);
        }

        .panel-content {
          padding: 16px;
        }

        .panel-summary {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
        }

        .chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .chip {
          flex: 0 0 auto;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #d4cec7;
          background: #fff;
          color: var(--sage-600);
          font-size: 12px;
          cursor: pointer;
        }

        .chip:hover {
          background: #fffaf0;
          border-color: var(--amber-400);
        }

        .form-section {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--slate-900);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .checkbox-group,
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox-item,
        .radio-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        input[type="checkbox"],
        input[type="radio"] {
          cursor: pointer;
          accent-color: var(--sage-600);
        }

        .checkbox-item label,
        .radio-item label {
          cursor: pointer;
          flex: 1;
        }

        textarea {
          width: 100%;
          min-height: 60px;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-family: inherit;
          font-size: 13px;
          resize: vertical;
        }

        textarea:focus {
          outline: none;
          border-color: var(--sage-600);
          box-shadow: 0 0 0 3px rgba(107, 87, 81, 0.1);
        }

        .button-group {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-generate {
          background: var(--sage-600);
          color: white;
        }

        .btn-generate:hover:not(:disabled) {
          background: #5a4945;
        }

        .btn-generate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--slate-100);
          color: var(--slate-900);
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .loading-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(107, 87, 81, 0.2);
          border-top-color: var(--sage-600);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .results-container {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .result-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--slate-900);
        }

        .result-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .result-copy,
        .result-insert {
          background: var(--sage-600);
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          flex: 0 0 auto;
        }

        .result-copy:hover,
        .result-insert:hover {
          background: #5a4945;
        }

        .result-insert {
          background: var(--emerald-500);
        }

        .result-insert:hover {
          background: #059669;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 16px;
        }
      </style>

      <div class="panel-wrapper">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-title-icon">✨</span>
            <span>Generate Comment</span>
          </div>
          <button class="panel-close" id="closeBtn">✕</button>
        </div>

        <div class="panel-content">
          ${this.state.error ? `<div class="error-message">${this.escapeHtml(this.state.error)}</div>` : ''}

          <div class="panel-summary">
            Saved defaults apply automatically. Adjust anything here only for this post, then click Generate.
          </div>

          <div class="form-section">
            <label class="form-label">Quick Override</label>
            <div class="chip-row">
              <button type="button" class="chip" data-override="crisp">Shorter</button>
              <button type="button" class="chip" data-override="witty">Funnier</button>
              <button type="button" class="chip" data-override="casual">More Casual</button>
              <button type="button" class="chip" data-override="professional">More Professional</button>
            </div>
          </div>

          <form id="genForm">
            <!-- Tone Selection -->
            <div class="form-section">
              <label class="form-label">Tone</label>
              <div class="checkbox-group">
                ${TONE_OPTIONS.map(
                  (tone) => `
                  <div class="checkbox-item">
                    <input type="checkbox" id="tone-${tone.value}" value="${tone.value}" name="tone"
                      ${this.state.tone.includes(tone.value as Tone) ? 'checked' : ''} />
                    <label for="tone-${tone.value}">${tone.label}</label>
                  </div>
                `
                ).join('')}
              </div>
            </div>

            <!-- Length Selection -->
            <div class="form-section">
              <label class="form-label">Length</label>
              <div class="radio-group">
                ${LENGTH_OPTIONS.map(
                  (length) => `
                  <div class="radio-item">
                    <input type="radio" id="length-${length.value}" value="${length.value}" name="length"
                      ${this.state.length === length.value ? 'checked' : ''} />
                    <label for="length-${length.value}">${length.label} - ${length.description}</label>
                  </div>
                `
                ).join('')}
              </div>
            </div>

            <!-- Intent Selection -->
            <div class="form-section">
              <label class="form-label">Intent</label>
              <div class="checkbox-group">
                ${INTENT_OPTIONS.map(
                  (intent) => `
                  <div class="checkbox-item">
                    <input type="checkbox" id="intent-${intent.value}" value="${intent.value}" name="intent"
                      ${this.state.intent.includes(intent.value as Intent) ? 'checked' : ''} />
                    <label for="intent-${intent.value}">${intent.label}</label>
                  </div>
                `
                ).join('')}
              </div>
            </div>

            <!-- Custom Modification -->
            <div class="form-section">
              <label class="form-label" for="customModify">Additional Instructions (Optional)</label>
              <textarea id="customModify" placeholder="e.g., Make it shorter or add a question...">${this.escapeHtml(this.state.customModify)}</textarea>
            </div>

            <!-- Buttons -->
            <div class="button-group">
              <button type="submit" class="btn-generate" ${this.state.isLoading ? 'disabled' : ''}>
                ${this.state.isLoading ? '<span class="loading-spinner"></span>Generating...' : 'Generate Comment'}
              </button>
            </div>
          </form>

          ${
            this.state.results.length > 0
              ? `
          <div class="results-container">
            <label class="form-label">Generated Comments</label>
            ${this.state.results
              .map(
                (result, index) => `
              <div class="result-item">
                <span>${this.escapeHtml(result)}</span>
                <div class="result-actions">
                  <button type="button" class="result-insert" data-index="${index}">Select & Insert</button>
                  <button type="button" class="result-copy" data-index="${index}">Copy</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Attach event listeners to form elements
   */
  private attachEventListeners() {
    // Close button
    const closeBtn = this.shadow.getElementById('closeBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.host.remove();
      });
    }

    // Form submission
    const form = this.shadow.getElementById('genForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Copy buttons
    this.shadow.querySelectorAll('.result-copy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = (e.target as HTMLElement).getAttribute('data-index');
        if (index !== null) {
          const result = this.state.results[parseInt(index)];
          if (result) {
            this.onCopyResult(result);
          }
        }
      });
    });

    this.shadow.querySelectorAll('.result-insert').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = (e.target as HTMLElement).getAttribute('data-index');
        if (index !== null) {
          const parsedIndex = parseInt(index, 10);
          const result = this.state.results[parsedIndex];
          if (result) {
            this.onInsertResult({ index: parsedIndex, text: result });
          }
        }
      });
    });

    this.shadow.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const override = (e.currentTarget as HTMLElement).getAttribute('data-override');
        if (!override) return;

        if (override === 'crisp') {
          this.setState({ length: 'crisp' });
          return;
        }

        const currentTone = new Set(this.state.tone);
        currentTone.add(override as Tone);
        this.setState({ tone: Array.from(currentTone) });
      });
    });
  }

  /**
   * Handle form submission
   */
  private handleFormSubmit() {
    // Get form values
    const toneCheckboxes = this.shadow.querySelectorAll(
      'input[name="tone"]:checked'
    ) as NodeListOf<HTMLInputElement>;
    const lengthRadio = this.shadow.querySelector(
      'input[name="length"]:checked'
    ) as HTMLInputElement;
    const intentCheckboxes = this.shadow.querySelectorAll(
      'input[name="intent"]:checked'
    ) as NodeListOf<HTMLInputElement>;
    const customModify = (this.shadow.getElementById('customModify') as HTMLTextAreaElement)
      .value;

    const tone = Array.from(toneCheckboxes).map((cb) => cb.value as Tone);
    const length = (lengthRadio?.value || 'medium') as Length;
    const intent = Array.from(intentCheckboxes).map((cb) => cb.value as Intent);

    // Update state
    this.setState({ tone, length, intent, customModify });

    // Call callback
    this.onGenerate({
      tone,
      length,
      intent,
      customInstruction: customModify,
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Close the panel
   */
  close() {
    this.host.remove();
  }
}
