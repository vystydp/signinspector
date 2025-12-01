/**
 * SignInspector Viewer
 * Main API entry point for embedding the signature inspector
 */

import type { ISignInspectorViewerOptions, ValidationResult, SignInspectorEvent } from './types';
import { EventEmitter } from './events';
import { validatePdfBytes, validatePdfFile } from './core/validation/validator';
import { t } from './i18n/i18n';

const DEFAULT_OPTIONS: ISignInspectorViewerOptions = {
  width: '100%',
  height: '600px',
  theme: 'light',
  autoResize: true,
  watermark: true,
  showDetailedCertInfo: false,
  showRawJson: false,
};

/**
 * SignInspectorViewer - Main viewer class
 *
 * Example usage:
 * ```typescript
 * const viewer = SignInspectorViewer.create(
 *   document.getElementById('viewer'),
 *   { autoResize: true, theme: 'light' }
 * );
 *
 * viewer.on('validationComplete', (result) => {
 *   console.log('Validation result:', result);
 * });
 *
 * viewer.setDocument(pdfBytes);
 * ```
 */
export class SignInspectorViewer {
  private options: ISignInspectorViewerOptions;
  private container: HTMLElement;
  private eventEmitter: EventEmitter;
  private resizeObserver?: ResizeObserver;
  private currentResult?: ValidationResult;

  private constructor(container: HTMLElement, options: ISignInspectorViewerOptions) {
    this.container = container;
    this.options = options;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Escape HTML special characters to prevent XSS and ensure proper display of international characters
   */
  private escapeHtml(text: string | undefined | null): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create a new SignInspectorViewer instance
   */
  static create(
    container: HTMLElement,
    options: Partial<ISignInspectorViewerOptions> = {}
  ): SignInspectorViewer {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Watermark option enabled (shown in UI, not console)

    const viewer = new SignInspectorViewer(container, mergedOptions);
    viewer.initialize();

    return viewer;
  }

  /**
   * Initialize the viewer
   */
  private initialize(): void {
    // Set container styles
    this.container.style.width =
      typeof this.options.width === 'number' ? `${this.options.width}px` : this.options.width!;
    this.container.style.minHeight =
      typeof this.options.height === 'number' ? `${this.options.height}px` : this.options.height!;
    this.container.style.height = 'auto';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'visible';

    // Setup auto-resize
    if (this.options.autoResize) {
      this.setupResizeObserver();
    }

    // Create placeholder content
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 400px; padding: 40px;">
        <div style="text-align: center; color: #64748b; max-width: 400px;">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin: 0 auto 24px; opacity: 0.5;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6" />
          </svg>
          <p style="font-size: 18px; font-weight: 600; color: #475569; margin: 0 0 8px 0;">No document loaded</p>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">Upload a PDF file above to view signature details</p>
        </div>
      </div>
    `;
  }

  /**
   * Setup resize observer
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Container resized - observer handles the monitoring
        // No need to emit event as it's not currently used
        const { width, height } = entry.contentRect;
        void width; // Mark as intentionally unused
        void height;
      }
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * Set document from Uint8Array or File
   */
  async setDocument(source: Uint8Array | File): Promise<void> {
    try {
      // Show loading state
      this.container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8fafc;">
          <div style="text-align: center; color: #64748b;">
            <div style="width: 48px; height: 48px; margin: 0 auto 16px; border: 4px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="font-size: 16px; font-weight: 500; margin: 0;">${t('signature.validatingSignatures')}</p>
          </div>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .spin { animation: none !important; }
          }
        </style>
      `;

      // Validate
      const result =
        source instanceof File ? await validatePdfFile(source) : await validatePdfBytes(source);

      this.currentResult = result;

      // Render result
      this.renderResult(result);

      // Announce result to screen readers
      this.announceStatus(result);

      // Emit event
      this.eventEmitter.emit('validationComplete', { result });
      if (source instanceof File) {
        this.eventEmitter.emit('documentLoaded', { filename: source.name, size: source.size });
      }
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : 'Validation failed');
    }
  }

  /**
   * Render validation result
   */
  private renderResult(result: ValidationResult): void {
    const statusColor = this.getStatusColor(result.overallStatus);
    const statusBg = this.getStatusBgColor(result.overallStatus);

    const signaturesHtml = result.signatures
      .map(
        (sig, idx) => `
      <article style="padding: 24px 0; margin-bottom: ${idx < result.signatures.length - 1 ? '32px' : '0'}; ${idx < result.signatures.length - 1 ? 'border-bottom: 2px solid #f1f5f9;' : ''}" aria-labelledby="sig-${idx}-header">
        <!-- Card Header: Signer Identity & Status -->
        <header style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
          <div style="flex: 1; min-width: 200px;">
            <h3 id="sig-${idx}-header" style="font-weight: 600; font-size: 17px; color: #0f172a; margin: 0 0 6px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${this.escapeHtml(sig.signerName)}
              ${sig.isBankId ? `<span style="display: inline-block; padding: 3px 10px; background: #dbeafe; color: #1e40af; border-radius: 6px; font-size: 11px; font-weight: 600;">🏦 ${t('signature.bankId')}</span>` : ''}
              <span style="padding: 4px 12px; background: ${this.getStatusBgColor(sig.status)}; color: ${this.getStatusColor(sig.status)}; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap;" role="status" aria-label="Signature status">
                ${t('status.' + sig.status.toLowerCase())}
              </span>
            </h3>
            ${sig.organization ? `<div style="font-size: 14px; color: #64748b; margin-bottom: 6px;">${this.escapeHtml(sig.organization)}</div>` : ''}
            <div style="font-size: 13px; color: #475569;">
              ${sig.isTrustedCA && sig.trustedCAName ? `<div style="color: #15803d; margin-bottom: 4px;">✓ ${t('trust.verifiedBy')} ${sig.trustedCAName}</div>` : ''}
              ${sig.isTrustedCA === false && !sig.euTrustList?.found ? `<div style="color: #ea580c;">⚠️ Certificate issuer not in system trust store</div>` : ''}
              ${sig.isTrustedCA === false && sig.euTrustList?.found ? `<div style="color: #0891b2;">ℹ️ ${t('validation.notInSystemTrustStore')} <a href="#" onclick="window.showEUTrustListModal?.(); return false;" style="color: #0891b2; text-decoration: underline; cursor: pointer;" tabindex="0" onkeydown="if(event.key==='Enter'){window.showEUTrustListModal?.();event.preventDefault();}">${t('trust.euTrustList')}</a></div>` : ''}
            </div>
          </div>
        </header>
        <!-- Integrity & Trust Status Grid -->
        <div style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <!-- Document Integrity Panel -->
          <div style="padding: 18px; background: ${sig.integrity.bytes === 'INTACT' ? '#f0fdf4' : sig.integrity.bytes === 'CHANGED' ? '#fef2f2' : '#f8fafc'}; border: ${sig.integrity.bytes === 'CHANGED' ? '3px' : '2px'} solid ${sig.integrity.bytes === 'INTACT' ? '#15803d' : sig.integrity.bytes === 'CHANGED' ? '#dc2626' : '#cbd5e1'}; border-radius: 10px;" role="region" aria-labelledby="integrity-${idx}">
            <div id="integrity-${idx}" style="font-size: 14px; font-weight: 600; color: ${sig.integrity.bytes === 'INTACT' ? '#15803d' : sig.integrity.bytes === 'CHANGED' ? '#dc2626' : '#64748b'}; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;" aria-hidden="true">${sig.integrity.bytes === 'INTACT' ? '✅' : sig.integrity.bytes === 'CHANGED' ? '❌' : '⚠️'}</span>
              <span>${t('integrity.title')}</span>
            </div>
            <div style="font-size: 13px; color: #475569; line-height: 1.5;">
              <strong style="color: ${sig.integrity.bytes === 'INTACT' ? '#15803d' : sig.integrity.bytes === 'CHANGED' ? '#dc2626' : '#64748b'};">${sig.integrity.message}</strong>
              ${sig.integrity.revisionChange === 'NONE' ? `<div style="font-size: 12px; color: #15803d; margin-top: 6px;">${t('integrity.coversEntire')}</div>` : ''}
              ${sig.integrity.bytes === 'CHANGED' ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 6px; font-style: italic;">${t('integrity.altered')}</div>` : ''}
              ${sig.integrity.details ? `<div style="font-size: 11px; color: #6b7280; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.02); border-radius: 4px; border-left: 2px solid #d1d5db;"><strong>Details:</strong> ${sig.integrity.details}</div>` : ''}
            </div>
          </div>

          <!-- Algorithm Trust Panel -->
          <div style="padding: 18px; background: ${sig.trust.status === 'TRUSTED' ? '#f0fdf4' : sig.trust.status === 'WEAK_ALGO' ? '#fffbeb' : '#f8fafc'}; border: 2px solid ${sig.trust.status === 'TRUSTED' ? '#15803d' : sig.trust.status === 'WEAK_ALGO' ? '#f59e0b' : '#cbd5e1'}; border-radius: 10px;" role="region" aria-labelledby="trust-${idx}">
            <div id="trust-${idx}" style="font-size: 14px; font-weight: 600; color: ${sig.trust.status === 'TRUSTED' ? '#15803d' : sig.trust.status === 'WEAK_ALGO' ? '#b45309' : '#64748b'}; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;" aria-hidden="true">${sig.trust.status === 'TRUSTED' ? '🔒' : sig.trust.status === 'WEAK_ALGO' ? '⚠️' : '🔍'}</span>
              <span>${t('algorithmTrust.title')}</span>
            </div>
            <div style="font-size: 13px; color: #475569; line-height: 1.5;">
              <strong style="color: ${sig.trust.status === 'TRUSTED' ? '#15803d' : sig.trust.status === 'WEAK_ALGO' ? '#b45309' : '#64748b'};">${t('algorithmTrust.' + (sig.trust.status === 'TRUSTED' ? 'trusted' : sig.trust.status === 'WEAK_ALGO' ? 'weakAlgo' : 'notEvaluated'))}</strong>
              ${sig.trust.status === 'TRUSTED' ? `<div style="font-size: 12px; color: #15803d; margin-top: 6px;">${t('algorithmTrust.meetsPolicy')}</div>` : ''}
              ${sig.trust.status === 'WEAK_ALGO' ? `<div style="font-size: 12px; color: #92400e; margin-top: 6px; font-style: italic;">${t('algorithmTrust.weakExplain')}</div>` : ''}
              ${sig.trust.policyWarnings.length > 0 ? `<div style="font-size: 12px; color: #b45309; margin-top: 6px;">${sig.trust.policyWarnings.length} ${t('algorithmTrust.warningsDetected')}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Cryptographic Algorithms (Collapsible) -->
        ${sig.algorithms && (sig.algorithms.hashAlgorithm || sig.algorithms.signatureAlgorithm) ? `
        <details style="margin-bottom: 20px;" open>
          <summary style="font-size: 14px; font-weight: 600; color: #475569; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; user-select: none; cursor: pointer; list-style: none; display: flex; align-items: center; gap: 8px; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
            <span style="font-size: 18px;">🔐</span>
            <span>${t('technical.details')}</span>
            <span style="margin-left: auto; font-size: 12px; color: #94a3b8;">▼</span>
          </summary>
        <section style="padding: 18px; background: #fafafa; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; margin-top: -1px;" aria-labelledby="algorithms-${idx}">
          <h4 id="algorithms-${idx}" style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">${t('algorithms.title')}</h4>
          <dl style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.8;">
            ${sig.algorithms.hashAlgorithm ? `
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 160px;">${t('algorithms.hashAlgorithm')}</dt>
              <dd style="margin: 0; color: #0f172a;">${sig.algorithms.hashAlgorithm}</dd>
            </div>` : ''}
            ${sig.algorithms.signatureAlgorithm ? `
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 160px;">${t('algorithms.signatureAlgorithm')}</dt>
              <dd style="margin: 0; color: #0f172a;">${sig.algorithms.signatureAlgorithm}</dd>
            </div>` : ''}
            ${sig.algorithms.keyType ? `
            <div style="display: flex;">
              <dt style="font-weight: 600; color: #475569; min-width: 160px;">${t('algorithms.keyType')}</dt>
              <dd style="margin: 0; color: #0f172a;">${sig.algorithms.keyType}${sig.algorithms.keySizeBits ? `, ${sig.algorithms.keySizeBits} ${t('algorithms.bits')}` : ''}</dd>
            </div>` : ''}
          </dl>
        </section>
        </details>
        ` : ''}

        <!-- Security Considerations -->
        ${sig.trust.policyWarnings && sig.trust.policyWarnings.length > 0 ? `
        <div style="margin-bottom: 16px; padding: 16px; background: ${sig.trust.policyWarnings.some(w => w.severity === 'error') ? '#fef2f2' : '#fffbeb'}; border-left: 4px solid ${sig.trust.policyWarnings.some(w => w.severity === 'error') ? '#dc2626' : '#f59e0b'}; border-radius: 6px;">
          <div style="font-size: 14px; font-weight: 600; color: ${sig.trust.policyWarnings.some(w => w.severity === 'error') ? '#dc2626' : '#b45309'}; margin-bottom: 12px;">ℹ️ ${t('warnings.title')}</div>
          ${sig.trust.policyWarnings.map(warning => `
            <div style="margin-bottom: 10px; padding: 10px; background: ${warning.severity === 'error' ? '#fee2e2' : warning.severity === 'warning' ? '#fef3c7' : '#e0f2fe'}; border-radius: 6px;">
              <div style="font-size: 12px; font-weight: 600; color: ${warning.severity === 'error' ? '#991b1b' : warning.severity === 'warning' ? '#92400e' : '#075985'}; margin-bottom: 4px;">
                ${warning.severity === 'error' ? '🛑' : warning.severity === 'warning' ? '⚠️' : 'ℹ️'} ${warning.code}
              </div>
              <div style="font-size: 12px; color: #64748b;">${warning.message}</div>
              ${warning.referenceUrl ? `<div style="margin-top: 4px;"><a href="${warning.referenceUrl}" target="_blank" style="font-size: 11px; color: #3b82f6; text-decoration: none;">📚 Reference</a></div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Signature Information -->
        <section style="margin-bottom: 20px; padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;" aria-labelledby="sig-info-${idx}">
          <h4 id="sig-info-${idx}" style="font-size: 15px; font-weight: 600; color: #475569; margin: 0 0 14px 0;">📋 ${t('signature.title')}</h4>
          <dl style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.8;">
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 120px;">${t('signature.signer')}</dt>
              <dd style="margin: 0; color: #0f172a;">${this.escapeHtml(sig.signerName)}</dd>
            </div>
            ${sig.organization ? `
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 120px;">${t('signature.organization')}</dt>
              <dd style="margin: 0; color: #0f172a;">${this.escapeHtml(sig.organization)}</dd>
            </div>` : ''}
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 120px;">${t('signature.signed')}</dt>
              <dd style="margin: 0; color: #0f172a;">${sig.signedAt.toLocaleString()}</dd>
            </div>
            ${sig.reason ? `
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 120px;">${t('signature.reason')}</dt>
              <dd style="margin: 0; color: #0f172a;">${this.escapeHtml(sig.reason)}</dd>
            </div>` : ''}
            ${sig.location ? `
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 120px;">${t('signature.location')}</dt>
              <dd style="margin: 0; color: #0f172a;">${this.escapeHtml(sig.location)}</dd>
            </div>` : ''}
            <div style="display: flex; margin-bottom: 8px;">
              <dt style="font-weight: 600; color: #475569; min-width: 120px;">${t('signature.coverage')}</dt>
              <dd style="margin: 0; color: ${sig.coversWholeDocument ? '#15803d' : '#ea580c'}; display: flex; align-items: center; gap: 6px;">
                <span>${sig.coversWholeDocument ? '✅' : '⚠️'}</span>
                <span>${sig.coversWholeDocument ? t('signature.entireDocument') : t('signature.partialDocument')}</span>
                ${!sig.coversWholeDocument ? '<button type="button" title="Some content may have been added after the signature was applied" style="background: none; border: none; color: #64748b; cursor: help; padding: 0; margin-left: 4px; font-size: 14px;">ⓘ</button>' : ''}
              </dd>
            </div>
          </dl>

          ${sig.euTrustList ? `
          <div style="margin-top: 14px; padding: 12px; background: ${sig.euTrustList.found ? '#dcfce7' : '#fef3c7'}; border-radius: 8px; border: 1px solid ${sig.euTrustList.found ? '#86efac' : '#fde047'};">
            <div style="font-weight: 600; color: ${sig.euTrustList.found ? '#15803d' : '#b45309'}; margin-bottom: 8px;">
              🇪🇺 ${sig.euTrustList.found ? t('trust.euFound') : t('trust.euNotFound')}
              <a href="#" onclick="window.showEUTrustListModal?.(); return false;" style="color: ${sig.euTrustList.found ? '#15803d' : '#b45309'}; text-decoration: underline; cursor: pointer;" tabindex="0" onkeydown="if(event.key==='Enter'){window.showEUTrustListModal?.();event.preventDefault();}">${t('trust.euTrustList')}</a>
            </div>
            ${sig.euTrustList.found ? `
            <dl style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.6;">
              <div style="margin-bottom: 4px;"><dt style="display: inline; font-weight: 600;">${t('trust.provider')}</dt> <dd style="display: inline; margin: 0;">${sig.euTrustList.providerName} (${sig.euTrustList.country})</dd></div>
              <div style="margin-bottom: 4px;"><dt style="display: inline; font-weight: 600;">${t('trust.service')}</dt> <dd style="display: inline; margin: 0;">${sig.euTrustList.serviceType}</dd></div>
              <div style="margin-bottom: 4px;"><dt style="display: inline; font-weight: 600;">${t('trust.status')}</dt> <dd style="display: inline; margin: 0;">${sig.euTrustList.status}</dd></div>
            </dl>
            ` : ''}
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
              ${t('trust.snapshot')}: ${sig.euTrustList.listVersion || 'unknown'}
            </div>
          </div>
          ` : ''}
        </section>

        <!-- Certificate Details (Collapsible) -->
        <details style="margin-top: 20px;">
          <summary style="font-size: 14px; font-weight: 600; color: #475569; padding: 14px; background: #f1f5f9; border-radius: 8px; user-select: none; cursor: pointer; list-style: none; display: flex; align-items: center; gap: 8px; transition: background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
            <span style="transition: transform 0.2s;">▶</span>
            <span>📜 ${t('certificate.title')}</span>
          </summary>
          <div style="margin-top: 12px; padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow-x: auto;">
            <dl style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.8;">
              <div style="margin-bottom: 12px;">
                <dt style="font-weight: 600; color: #475569; margin-bottom: 4px;">${t('certificate.subject')}</dt>
                <dd style="margin: 0; font-family: 'Courier New', monospace; font-size: 11px; word-wrap: break-word; overflow-wrap: anywhere; color: #0f172a;">${sig.certificate.subject}</dd>
              </div>
              <div style="margin-bottom: 12px;">
                <dt style="font-weight: 600; color: #475569; margin-bottom: 4px;">${t('certificate.issuer')}</dt>
                <dd style="margin: 0; font-family: 'Courier New', monospace; font-size: 11px; word-wrap: break-word; overflow-wrap: anywhere; color: #0f172a;">${sig.certificate.issuer}</dd>
              </div>
              <div style="margin-bottom: 12px;">
                <dt style="font-weight: 600; color: #475569; margin-bottom: 4px;">${t('certificate.serialNumber')}</dt>
                <dd style="margin: 0; font-family: 'Courier New', monospace; word-wrap: break-word; overflow-wrap: anywhere; color: #0f172a;">${sig.certificate.serialNumber}</dd>
              </div>
              <div style="margin-bottom: 12px;">
                <dt style="font-weight: 600; color: #475569; margin-bottom: 4px;">${t('certificate.validityPeriod')}</dt>
                <dd style="margin: 0; color: #0f172a;">
                  <div>${t('certificate.from')} ${sig.certificate.notBefore.toLocaleString()}</div>
                  <div>${t('certificate.until')} ${sig.certificate.notAfter.toLocaleString()}</div>
                </dd>
              </div>
              ${sig.certificate.fingerprint ? `
              <div>
                <dt style="font-weight: 600; color: #475569; margin-bottom: 4px;">${t('certificate.fingerprint')}</dt>
                <dd style="margin: 0; font-family: 'Courier New', monospace; font-size: 10px; word-wrap: break-word; overflow-wrap: break-word; color: #0f172a;">${sig.certificate.fingerprint}</dd>
              </div>` : ''}
            </dl>
          </div>
        </details>

        ${sig.error ? `<div role="alert" style="padding: 14px 16px; background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; font-size: 13px; color: #b91c1c; border-radius: 8px; margin-top: 20px;">${sig.error}</div>` : ''}
      </article>
    `
      )
      .join('');

    // Calculate overall integrity and trust status
    const overallIntegrityOk = result.signatures.every(sig => sig.integrity.status === 'OK');
    const hasWeakAlgo = result.signatures.some(sig => sig.trust.status === 'WEAK_ALGO');
    const allTrusted = result.signatures.every(sig => sig.trust.status === 'TRUSTED');

    this.container.innerHTML = `
      <div style="height: 100%; overflow: visible; padding: 24px;">
        <div style="max-width: 960px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px;">

          <!-- Global Status Banner -->
          <div role="alert" aria-live="polite" style="background: ${statusBg}; border: 2px solid ${statusColor}; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px;">
              <div style="flex: 1; min-width: 250px;">
                <h2 style="font-size: 18px; font-weight: 700; color: ${statusColor}; margin: 0 0 10px 0; line-height: 1.3;">
                  ${result.signatureCount} ${t('signature.signaturesFound')}${result.documentModified ? ' • ' + t('signature.documentModifiedAfter') : ''}
                </h2>
                <div style="margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                  <span style="padding: 6px 12px; background: ${overallIntegrityOk ? '#dcfce7' : '#fef2f2'}; color: ${overallIntegrityOk ? '#15803d' : '#dc2626'}; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;" role="status">
                    <span aria-hidden="true">${overallIntegrityOk ? '✅' : '❌'}</span>
                    <span>${t('integrity.title')}: ${overallIntegrityOk ? t('integrity.ok') : t('integrity.modified')}</span>
                  </span>
                  <span style="padding: 6px 12px; background: ${allTrusted ? '#dcfce7' : hasWeakAlgo ? '#fef3c7' : '#f1f5f9'}; color: ${allTrusted ? '#15803d' : hasWeakAlgo ? '#b45309' : '#64748b'}; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;" role="status">
                    <span aria-hidden="true">${allTrusted ? '🔒' : hasWeakAlgo ? '⚠️' : '🔍'}</span>
                    <span>${t('algorithms.title')}: ${allTrusted ? t('algorithmTrust.strong') : hasWeakAlgo ? t('algorithmTrust.weakDetected') : t('algorithmTrust.notEval')}</span>
                  </span>
                </div>
              </div>
              <div style="font-size: 56px; line-height: 1;" aria-hidden="true">${this.getStatusIcon(result.overallStatus)}</div>
            </div>
          </div>

          ${result.metadata.title || result.metadata.author ? `
          <section style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" aria-labelledby="doc-info-heading">
            <h3 id="doc-info-heading" style="font-weight: 600; font-size: 15px; color: #0f172a; margin: 0 0 14px 0;">📄 Document Information</h3>
            <dl style="margin: 0; font-size: 13px; line-height: 1.8;">
              ${result.metadata.title ? `<div style="margin-bottom: 6px;"><dt style="display: inline; font-weight: 600; color: #475569;">Title:</dt> <dd style="display: inline; margin: 0; color: #0f172a;">${result.metadata.title}</dd></div>` : ''}
              ${result.metadata.author ? `<div style="margin-bottom: 6px;"><dt style="display: inline; font-weight: 600; color: #475569;">Author:</dt> <dd style="display: inline; margin: 0; color: #0f172a;">${result.metadata.author}</dd></div>` : ''}
              ${result.metadata.pageCount ? `<div><dt style="display: inline; font-weight: 600; color: #475569;">Pages:</dt> <dd style="display: inline; margin: 0; color: #0f172a;">${result.metadata.pageCount}</dd></div>` : ''}
            </dl>
          </section>
          ` : ''}

          <section aria-labelledby="signatures-heading" style="margin-top: 32px;">
            <h3 id="signatures-heading" style="font-weight: 600; font-size: 18px; color: #0f172a; margin: 0 0 20px 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">✍️ ${t('signature.signatures')}</h3>
            ${signaturesHtml}
          </section>
        </div>
      </div>

      <!-- EU Trust List Modal -->
      <div id="euTrustListModal" role="dialog" aria-modal="true" aria-labelledby="modal-title" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 10000; overflow: auto; animation: fadeIn 0.2s ease-out;">
        <div style="min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px;">
          <div style="background: white; border-radius: 16px; max-width: 950px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; animation: slideUp 0.3s ease-out;">

            <!-- Header -->
            <header style="padding: 28px 32px; border-bottom: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, #ffffff, #f8fafc);">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🇪🇺</div>
                  <h2 id="modal-title" style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">EU Trusted List</h2>
                </div>
                <p style="margin: 0; font-size: 14px; color: #64748b; padding-left: 52px;">European Qualified Trust Service Providers - Official Registry</p>
              </div>
              <button type="button" onclick="window.hideEUTrustListModal?.()" aria-label="Close dialog" style="background: #f1f5f9; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: all 0.2s; flex-shrink: 0; margin-left: 16px;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a'; this.style.transform='rotate(90deg)'" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'; this.style.transform='rotate(0deg)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">✕</button>
            </header>

            <!-- Search and Filter Section -->
            <div style="padding: 24px 32px; background: #fafbfc; border-bottom: 1px solid #e2e8f0;">
              <div style="position: relative; margin-bottom: 16px;">
                <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 18px; pointer-events: none;">🔍</div>
                <label for="trustListSearch" class="sr-only">Search trust list</label>
                <input id="trustListSearch" type="text" placeholder="Search by provider name, country, or service type..." aria-label="Search providers, countries, or services" style="width: 100%; padding: 14px 16px 14px 48px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 15px; box-sizing: border-box; transition: all 0.2s; background: white; font-family: inherit;" oninput="window.filterTrustList?.(this.value)" onfocus="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'" />
              </div>

              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Filter:</span>
                <div role="group" aria-label="Filter by country" style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" onclick="window.filterTrustListByCountry?.('')" style="padding: 9px 16px; background: #0284c7; color: white; border: none; border-radius: 10px; font-size: 13px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);" onmouseover="this.style.background='#0369a1'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(2, 132, 199, 0.3)'" onmouseout="this.style.background='#0284c7'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(2, 132, 199, 0.2)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">All Countries</button>
                  <button type="button" onclick="window.filterTrustListByCountry?.('CZ')" aria-label="Filter Czech providers" style="padding: 9px 16px; background: white; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">🇨🇿 Czech</button>
                  <button type="button" onclick="window.filterTrustListByCountry?.('DE')" aria-label="Filter German providers" style="padding: 9px 16px; background: white; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">🇩🇪 German</button>
                  <button type="button" onclick="window.filterTrustListByCountry?.('ES')" aria-label="Filter Spanish providers" style="padding: 9px 16px; background: white; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">🇪🇸 Spanish</button>
                  <button type="button" onclick="window.filterTrustListByCountry?.('FR')" aria-label="Filter French providers" style="padding: 9px 16px; background: white; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">🇫🇷 French</button>
                  <button type="button" onclick="window.filterTrustListByCountry?.('IT')" aria-label="Filter Italian providers" style="padding: 9px 16px; background: white; color: #475569; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'" onfocus="this.style.outline='2px solid #3b82f6'; this.style.outlineOffset='2px'" onblur="this.style.outline='none'">🇮🇹 Italian</button>
                </div>
              </div>
            </div>

            <!-- Provider List -->
            <div id="trustListContent" style="flex: 1; overflow-y: auto; padding: 24px 32px; background: white;">
              <div style="text-align: center; color: #94a3b8; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📋</div>
                <div style="font-size: 15px; font-weight: 500;">Loading trust list...</div>
              </div>
            </div>

            <!-- Footer -->
            <footer style="padding: 20px 32px; border-top: 2px solid #f1f5f9; background: linear-gradient(to top, #f8fafc, #ffffff);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s ease-in-out infinite;"></div>
                  <span style="font-size: 13px; color: #64748b; font-weight: 500;">Snapshot: <strong style="color: #0f172a;">${result.signatures[0]?.euTrustList?.listVersion || 'unknown'}</strong></span>
                </div>
                <div style="font-size: 12px; color: #94a3b8;">
                  <span style="margin-right: 4px;">📅</span>Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <style>
        /* Modal animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Details chevron animation */
        details > summary > span:first-child {
          transition: transform 0.2s ease;
        }
        details[open] > summary > span:first-child {
          transform: rotate(90deg);
        }

        /* Custom scrollbar for modal */
        #trustListContent::-webkit-scrollbar {
          width: 10px;
        }
        #trustListContent::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        #trustListContent::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 2px solid #f1f5f9;
        }
        #trustListContent::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          details > summary > span:first-child {
            transition: none !important;
          }
        }

        /* Focus visible styles */
        .focus-visible:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      </style>      <script>
        // Immediately define modal functions in global scope
        (function() {
          let trustListData = [];
          let filteredData = [];
          let modalElement = null;
          let searchInput = null;
          let previousFocusElement = null;

          function handleModalKeydown(e) {
            if (!modalElement) return;

            // Close on Escape key
            if (e.key === 'Escape') {
              if (window.hideEUTrustListModal) {
                window.hideEUTrustListModal();
              }
              e.preventDefault();
              return;
            }

            // Trap focus within modal
            if (e.key === 'Tab') {
              const focusableElements = modalElement.querySelectorAll(
                'button, input, [tabindex]:not([tabindex="-1"])'
              );
              if (focusableElements.length === 0) return;

              const firstElement = focusableElements[0];
              const lastElement = focusableElements[focusableElements.length - 1];

              if (e.shiftKey && document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
              } else if (!e.shiftKey && document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
              }
            }
          }

          // Define modal functions FIRST before anything else
          window.showEUTrustListModal = function() {
            console.log('showEUTrustListModal called');
            modalElement = document.getElementById('euTrustListModal');
            if (!modalElement) {
              console.error('Modal element #euTrustListModal not found');
              return;
            }

            console.log('Modal element found, showing modal');
            searchInput = document.getElementById('trustListSearch');
            previousFocusElement = document.activeElement;

            modalElement.style.display = 'block';
            document.body.style.overflow = 'hidden';            if (searchInput) {
              setTimeout(function() { searchInput.focus(); }, 100);
            }

            modalElement.addEventListener('keydown', handleModalKeydown);
          };

          window.hideEUTrustListModal = function() {
            if (!modalElement) {
              modalElement = document.getElementById('euTrustListModal');
            }

            if (modalElement) {
              modalElement.style.display = 'none';
              modalElement.removeEventListener('keydown', handleModalKeydown);
            }

            document.body.style.overflow = '';

            if (previousFocusElement && typeof previousFocusElement.focus === 'function') {
              previousFocusElement.focus();
            }

            previousFocusElement = null;
          };

          // Load trust list
          fetch('/trust/eutl-providers.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
              trustListData = data.providers;
              filteredData = trustListData;
              renderTrustList();
            })
            .catch(function(err) {
              console.error('Failed to load trust list:', err);
              const content = document.getElementById('trustListContent');
              if (content) {
                content.innerHTML = '<div style="text-align: center; color: #dc2626; padding: 40px;" role="alert">Failed to load trust list</div>';
              }
            });

          function renderTrustList() {
            const content = document.getElementById('trustListContent');
            if (filteredData.length === 0) {
              content.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px;">No providers found</div>';
              return;
            }

            // Group by QTSP
            const grouped = {};
            filteredData.forEach(provider => {
              const key = provider.id.split(':')[1] || provider.name;
              if (!grouped[key]) {
                grouped[key] = [];
              }
              grouped[key].push(provider);
            });

            content.innerHTML = Object.keys(grouped).map(qtsp => {
              const providers = grouped[qtsp];
              const first = providers[0];
              return \`
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                      <div style="font-weight: 600; font-size: 15px; color: #0f172a;">\${first.name}</div>
                      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Service: \${first.serviceType} • Status: \${first.status}</div>
                    </div>
                    <span style="padding: 4px 8px; background: #dcfce7; color: #15803d; border-radius: 6px; font-size: 11px; font-weight: 600;">\${first.country}</span>
                  </div>
                  <details style="margin-top: 12px;">
                    <summary style="cursor: pointer; font-size: 12px; color: #3b82f6; user-select: none;">Show \${providers.length} pattern(s)</summary>
                    <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 6px; font-family: monospace; font-size: 11px; color: #475569;">
                      \${providers.map(p => p.issuerDnPattern).join('<br>')}
                    </div>
                  </details>
                </div>
              \`;
            }).join('');
          }

          window.filterTrustList = function(query) {
            const q = query.toLowerCase();
            filteredData = trustListData.filter(p =>
              p.name.toLowerCase().includes(q) ||
              p.country.toLowerCase().includes(q) ||
              p.serviceType.toLowerCase().includes(q) ||
              p.issuerDnPattern.toLowerCase().includes(q)
            );
            renderTrustList();
          };

          window.filterTrustListByCountry = function(country) {
            if (!country) {
              filteredData = trustListData;
            } else {
              filteredData = trustListData.filter(p => p.country === country);
            }
            document.getElementById('trustListSearch').value = '';
            renderTrustList();
          };

          // Close on background click
          document.getElementById('euTrustListModal').addEventListener('click', function(e) {
            if (e.target === this) {
              window.hideEUTrustListModal();
            }
          });
        })();
      </script>
    `;

    // Execute the script manually since innerHTML doesn't run scripts
    this.initializeModalScript();
  }

  /**
   * Initialize modal script after DOM is ready
   */
  private initializeModalScript(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      const scriptContent = `
        (function() {
          let trustListData = [];
          let filteredData = [];
          let modalElement = null;
          let searchInput = null;
          let previousFocusElement = null;

          function handleModalKeydown(e) {
            if (!modalElement) return;

            if (e.key === 'Escape') {
              if (window.hideEUTrustListModal) {
                window.hideEUTrustListModal();
              }
              e.preventDefault();
              return;
            }

            if (e.key === 'Tab') {
              const focusableElements = modalElement.querySelectorAll(
                'button, input, [tabindex]:not([tabindex="-1"])'
              );
              if (focusableElements.length === 0) return;

              const firstElement = focusableElements[0];
              const lastElement = focusableElements[focusableElements.length - 1];

              if (e.shiftKey && document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
              } else if (!e.shiftKey && document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
              }
            }
          }

          window.showEUTrustListModal = function() {
            console.log('showEUTrustListModal called');
            modalElement = document.getElementById('euTrustListModal');
            if (!modalElement) {
              console.error('Modal element #euTrustListModal not found');
              return;
            }

            console.log('Modal element found, showing modal');
            searchInput = document.getElementById('trustListSearch');
            previousFocusElement = document.activeElement;

            modalElement.style.display = 'block';
            document.body.style.overflow = 'hidden';

            if (searchInput) {
              setTimeout(function() { searchInput.focus(); }, 100);
            }

            modalElement.addEventListener('keydown', handleModalKeydown);
          };

          window.hideEUTrustListModal = function() {
            if (!modalElement) {
              modalElement = document.getElementById('euTrustListModal');
            }

            if (modalElement) {
              modalElement.style.display = 'none';
              modalElement.removeEventListener('keydown', handleModalKeydown);
            }

            document.body.style.overflow = '';

            if (previousFocusElement && typeof previousFocusElement.focus === 'function') {
              previousFocusElement.focus();
            }

            previousFocusElement = null;
          };

          fetch('/trust/eutl-providers.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
              trustListData = data.providers;
              filteredData = trustListData;
              renderTrustList();
            })
            .catch(function(err) {
              console.error('Failed to load trust list:', err);
              const content = document.getElementById('trustListContent');
              if (content) {
                content.innerHTML = '<div style="text-align: center; color: #dc2626; padding: 40px;" role="alert">Failed to load trust list</div>';
              }
            });

          function renderTrustList() {
            const content = document.getElementById('trustListContent');
            if (!content) return;
            if (filteredData.length === 0) {
              content.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px; font-size: 14px;">No providers found</div>';
              return;
            }

            const grouped = {};
            filteredData.forEach(function(provider) {
              const key = provider.id.split(':')[1] || provider.name;
              if (!grouped[key]) {
                grouped[key] = [];
              }
              grouped[key].push(provider);
            });

            content.innerHTML = Object.keys(grouped).map(function(qtsp) {
              const providers = grouped[qtsp];
              const first = providers[0];
              return \`
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s ease;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'; this.style.borderColor='#e2e8f0';">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; font-size: 16px; color: #0f172a; margin-bottom: 6px;">\${first.name}</div>
                      <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: #64748b;">
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                          <span style="color: #3b82f6;">●</span> \${first.serviceType}
                        </span>
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                          <span style="color: #10b981;">✓</span> \${first.status}
                        </span>
                      </div>
                    </div>
                    <span style="padding: 6px 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 8px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">\${first.country}</span>
                  </div>
                  <details style="margin-top: 16px;">
                    <summary style="cursor: pointer; font-size: 13px; color: #3b82f6; user-select: none; font-weight: 500; padding: 8px 0; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.color='#2563eb';" onmouseout="this.style.color='#3b82f6';">
                      <span style="transition: transform 0.2s;">▸</span> Show \${providers.length} issuer pattern\${providers.length > 1 ? 's' : ''}
                    </summary>
                    <div style="margin-top: 12px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; color: #475569; line-height: 1.6; overflow-x: auto;">
                      \${providers.map(function(p, idx) {
                        return '<div style="padding: 6px 0; border-bottom: ' + (idx < providers.length - 1 ? '1px solid #e2e8f0' : 'none') + ';">' + p.issuerDnPattern + '</div>';
                      }).join('')}
                    </div>
                  </details>
                </div>
              \`;
            }).join('');
          }

          window.filterTrustList = function(query) {
            const q = query.toLowerCase();
            filteredData = trustListData.filter(function(p) {
              return p.name.toLowerCase().includes(q) ||
                p.country.toLowerCase().includes(q) ||
                p.serviceType.toLowerCase().includes(q) ||
                p.issuerDnPattern.toLowerCase().includes(q);
            });
            renderTrustList();
          };

          window.filterTrustListByCountry = function(country) {
            if (!country) {
              filteredData = trustListData;
            } else {
              filteredData = trustListData.filter(function(p) { return p.country === country; });
            }
            const searchEl = document.getElementById('trustListSearch');
            if (searchEl) searchEl.value = '';
            renderTrustList();
          };

          const modal = document.getElementById('euTrustListModal');
          if (modal) {
            modal.addEventListener('click', function(e) {
              if (e.target === this) {
                window.hideEUTrustListModal();
              }
            });
          }
        })();
      `;

      // Create and execute script
      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.head.appendChild(script);
      console.log('Modal script initialized');
    }, 10);
  }

  /**
   * Render error
   */
  private renderError(message: string): void {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #fef2f2; padding: 24px;">
        <div style="text-align: center; max-width: 400px;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <div style="font-size: 18px; font-weight: 600; color: #b91c1c; margin-bottom: 8px;">Validation Error</div>
          <div style="font-size: 14px; color: #dc2626;">${message}</div>
        </div>
      </div>
    `;
  }

  /**
   * Clear the viewer
   */
  clear(): void {
    this.currentResult = undefined;
    this.initialize();
  }

  /**
   * Get current options
   */
  getOptions(): ISignInspectorViewerOptions {
    return { ...this.options };
  }

  /**
   * Get current validation result
   */
  getResult(): ValidationResult | undefined {
    return this.currentResult ? { ...this.currentResult } : undefined;
  }

  /**
   * Subscribe to events
   */
  on<T extends SignInspectorEvent>(
    event: T,
    callback: (data: import('./events').EventDataMap[T]) => void
  ): () => void {
    return this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from events
   */
  off<T extends SignInspectorEvent>(
    event: T,
    callback: (data: import('./events').EventDataMap[T]) => void
  ): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Announce validation status to screen readers
   */
  private announceStatus(result: ValidationResult): void {
    const announcer = document.getElementById('status-announcer');
    if (announcer) {
      const integrityStatus = result.signatures.every(sig => sig.integrity.status === 'OK')
        ? 'all signatures valid'
        : 'document modified after signing';
      announcer.textContent = `Validation complete: ${result.signatureCount} signature(s) found, ${integrityStatus}`;
    }
  }

  /**
   * Destroy the viewer
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.eventEmitter.removeAllListeners();
    this.container.innerHTML = '';
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'VALID':
        return '#15803d';
      case 'INVALID':
        return '#b91c1c';
      default:
        return '#b45309';
    }
  }

  private getStatusBgColor(status: string): string {
    switch (status) {
      case 'VALID':
        return '#f0fdf4';
      case 'INVALID':
        return '#fef2f2';
      default:
        return '#fffbeb';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'VALID':
        return '✅';
      case 'INVALID':
        return '❌';
      default:
        return '⚠️';
    }
  }
}
