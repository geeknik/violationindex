import type { ViolationBundle } from './types.js';

/**
 * Generate a plaintiff intake packet for class action firms.
 * Structured for attorney review and potential litigation.
 */
export function generatePlaintiffPacket(bundle: ViolationBundle): string {
  var v = bundle.violation;
  var destinations = new Set(bundle.evidence.map(function(e) { return e.request_destination; }));

  var lines: string[] = [];

  lines.push('# PLAINTIFF INTAKE PACKET');
  lines.push('');
  lines.push('**PRIVILEGED AND CONFIDENTIAL — FOR ATTORNEY REVIEW ONLY**');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Case Summary');
  lines.push('');
  lines.push('**Potential Defendant:** ' + v.site_domain);
  lines.push('**Violation Class:** ' + formatViolationType(v.violation_type));
  lines.push('**Reference ID:** VI-' + v.id);
  lines.push('**Date Prepared:** ' + new Date().toISOString().split('T')[0]);
  lines.push('');

  // Cause of action
  lines.push('## Potential Causes of Action');
  lines.push('');
  if (v.violation_type === 'preconsent_marketing_transfer') {
    lines.push('1. **CCPA/CPRA violation (Cal. Civ. Code 1798.100 et seq.)** — Sale/sharing of');
    lines.push('   personal information without consumer consent or opt-out opportunity');
    lines.push('2. **Wiretap Act / CIPA (Cal. Penal Code 631)** — Unauthorized interception of');
    lines.push('   electronic communications via third-party tracking without consent');
    lines.push('3. **Unfair/Deceptive Practices** — Privacy policy misrepresentation');
    lines.push('4. **UCL (Cal. Bus. & Prof. Code 17200)** — Unfair business practices');
  } else {
    lines.push('1. **CCPA/CPRA violation** — Failure to honor Global Privacy Control opt-out signal');
    lines.push('   as required under Cal. Civ. Code 1798.135(e)');
    lines.push('2. **Unfair/Deceptive Practices** — Claiming to honor opt-out while ignoring GPC');
    lines.push('3. **UCL (Cal. Bus. & Prof. Code 17200)** — Unfair business practices');
  }
  lines.push('');

  // Class definition
  lines.push('## Potential Class Definition');
  lines.push('');
  lines.push('All persons in [jurisdiction] who visited ' + v.site_domain + ' and whose');
  lines.push('personal information was transmitted to third-party marketing services');
  if (v.violation_type === 'preconsent_marketing_transfer') {
    lines.push('without prior consent, from [date] to present.');
  } else {
    lines.push('despite having Global Privacy Control enabled, from [date] to present.');
  }
  lines.push('');

  // Scale
  lines.push('## Estimated Scale');
  lines.push('');
  if (v.estimated_users) {
    lines.push('- **Estimated monthly visitors:** ' + formatNumber(v.estimated_users));
  }
  lines.push('- **Third-party recipients:** ' + destinations.size);
  lines.push('- **Documented violations:** ' + v.evidence_count);
  lines.push('- **Observation period:** ' + formatDate(v.first_observed) + ' to ' + formatDate(v.last_observed));
  if (v.estimated_exposure_min) {
    lines.push('- **Estimated statutory damages range:** $' + formatNumber(v.estimated_exposure_min) +
      ' — $' + formatNumber(v.estimated_exposure_max));
  }
  lines.push('');

  // Precedent
  lines.push('## Relevant Precedent');
  lines.push('');
  lines.push('- *In re: GoodRx Holdings* — FTC consent order, $25M (2023)');
  lines.push('- *People v. Sephora* — CA AG CCPA enforcement, $1.2M (2022)');
  lines.push('- *In re: BetterHelp* — FTC consent order, $7.8M (2023)');
  lines.push('- *In re: Advocate Aurora Health* — OCR HIPAA settlement, $12.25M (2023)');
  lines.push('- *Javier v. Assurance IQ* — 9th Cir., CIPA wiretap claims for pixel tracking (2023)');
  lines.push('');

  // Evidence summary
  lines.push('## Available Evidence');
  lines.push('');
  lines.push('- ' + v.evidence_count + ' timestamped evidence records with SHA-256 hashes');
  lines.push('- Hash-chained audit trail (tamper-evident)');
  lines.push('- Third-party tracking destinations: ' + Array.from(destinations).join(', '));
  if (bundle.policySnapshots.length > 0) {
    lines.push('- Privacy policy snapshot with SHA-256 verification hash');
  }
  lines.push('- Full dossier available on request');
  lines.push('');

  // Contact
  lines.push('## Source Organization');
  lines.push('');
  lines.push('**Violation Index** — https://violationindex.com');
  lines.push('**Contact:** b@deepforkcyber.com');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*This packet is informational and does not constitute legal advice.*');
  lines.push('*Violation Index provides evidence infrastructure, not legal representation.*');

  return lines.join('\n');
}

function formatViolationType(type: string): string {
  if (type === 'preconsent_marketing_transfer') return 'Pre-Consent Marketing Data Transfer';
  if (type === 'gpc_ignored') return 'Global Privacy Control Signal Ignored';
  return type;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toISOString().split('T')[0] || 'N/A';
}

function formatNumber(n: number | null): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}
