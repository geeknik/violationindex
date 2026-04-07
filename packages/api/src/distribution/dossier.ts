import type { ViolationBundle } from './types.js';

/**
 * Generate a legal-grade evidence dossier.
 * Comprehensive, cite-able, designed for legal review and regulatory filing.
 */
export function generateDossier(bundle: ViolationBundle): string {
  var v = bundle.violation;
  var typeLabel = v.violation_type === 'preconsent_marketing_transfer'
    ? 'Pre-Consent Marketing Data Transfer' : 'Global Privacy Control Signal Ignored';

  var lines: string[] = [];

  lines.push('# VIOLATION DOSSIER');
  lines.push('');
  lines.push('## ' + v.site_domain + ' — ' + typeLabel);
  lines.push('');
  lines.push('**Dossier ID:** VI-' + v.id);
  lines.push('**Generated:** ' + new Date().toISOString());
  lines.push('**Status:** ' + v.status.toUpperCase());
  lines.push('**Severity:** ' + v.severity.toUpperCase());
  lines.push('');
  lines.push('---');
  lines.push('');

  // Executive summary
  lines.push('## 1. Executive Summary');
  lines.push('');
  lines.push('This dossier documents ' + v.evidence_count + ' instance(s) of ' + typeLabel.toLowerCase());
  lines.push('by **' + v.site_domain + '**, observed between ' + formatDate(v.first_observed));
  lines.push('and ' + formatDate(v.last_observed) + '.');
  lines.push('');
  if (v.violation_type === 'preconsent_marketing_transfer') {
    lines.push('The site transmitted user data to third-party marketing and tracking services');
    lines.push('**before** any consent mechanism was presented to or interacted with by the user.');
    lines.push('This behavior contradicts standard privacy policy representations that data');
    lines.push('collection requires user consent.');
  } else {
    lines.push('The site ignored the Global Privacy Control (GPC) signal, a legally binding');
    lines.push('opt-out mechanism under CCPA/CPRA, and continued to transfer user data to');
    lines.push('third-party marketing services.');
  }
  lines.push('');

  // Estimated impact
  if (v.estimated_users || v.estimated_exposure_min) {
    lines.push('**Estimated affected users:** ' + formatNumber(v.estimated_users));
    lines.push('**Estimated regulatory exposure:** $' + formatNumber(v.estimated_exposure_min) +
      ' — $' + formatNumber(v.estimated_exposure_max));
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Evidence detail
  lines.push('## 2. Evidence Records');
  lines.push('');
  lines.push('| # | Timestamp | Destination | Type | Consent State | GPC Active |');
  lines.push('|---|-----------|-------------|------|---------------|------------|');

  for (var i = 0; i < bundle.evidence.length; i++) {
    var e = bundle.evidence[i]!;
    lines.push('| ' + (i + 1) + ' | ' + formatDate(e.observed_at) + ' | ' +
      e.request_destination + ' | ' + e.request_type + ' | ' +
      e.consent_state + ' | ' + (e.gpc_active ? 'Yes' : 'No') + ' |');
  }
  lines.push('');

  // Unique destinations
  var destinations = new Set(bundle.evidence.map(function(e) { return e.request_destination; }));
  lines.push('**Unique third-party destinations:** ' + destinations.size);
  lines.push('');
  destinations.forEach(function(d) {
    lines.push('- ' + d);
  });
  lines.push('');

  // Consent mechanism
  var mechanisms = new Set(bundle.evidence.map(function(e) { return e.consent_mechanism; }));
  var cmpNames = new Set(bundle.evidence.map(function(e) { return e.cmp_name; }).filter(Boolean));
  lines.push('**Consent mechanism(s) detected:** ' + Array.from(mechanisms).join(', '));
  if (cmpNames.size > 0) {
    lines.push('**CMP(s) identified:** ' + Array.from(cmpNames).join(', '));
  }
  lines.push('');

  // TCF consent string
  var tcfStrings = bundle.evidence.filter(function(e) { return e.tcf_consent_string; });
  if (tcfStrings.length > 0) {
    lines.push('**TCF consent string at observation time:** `' + (tcfStrings[0]!.tcf_consent_string || 'empty/null') + '`');
    lines.push('*(An empty or null TCF string indicates no consent had been given)*');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Policy snapshots
  if (bundle.policySnapshots.length > 0) {
    lines.push('## 3. Privacy Policy Snapshots');
    lines.push('');
    for (var j = 0; j < bundle.policySnapshots.length; j++) {
      var ps = bundle.policySnapshots[j]!;
      lines.push('- **URL:** ' + ps.policy_url);
      lines.push('  **SHA-256:** `' + ps.content_hash + '`');
      lines.push('  **Fetched:** ' + formatDate(ps.fetched_at));
      lines.push('  **Size:** ' + formatNumber(ps.content_length) + ' characters');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // Chain of custody
  lines.push('## 4. Chain of Custody (Audit Trail)');
  lines.push('');
  lines.push('All entries are hash-chained. Modification of any entry invalidates all subsequent hashes.');
  lines.push('');
  lines.push('| Timestamp | Action | Actor | Entry Hash |');
  lines.push('|-----------|--------|-------|------------|');
  for (var k = 0; k < bundle.auditTrail.length; k++) {
    var a = bundle.auditTrail[k]!;
    lines.push('| ' + formatDate(a.timestamp) + ' | ' + a.action + ' | ' + a.actor +
      ' | `' + a.entry_hash.slice(0, 16) + '...` |');
  }
  lines.push('');

  // Evidence hashes
  lines.push('## 5. Evidence Fingerprints');
  lines.push('');
  lines.push('Each evidence record is individually hashed (SHA-256) for tamper detection.');
  lines.push('');
  for (var m = 0; m < bundle.evidence.length; m++) {
    var ev = bundle.evidence[m]!;
    lines.push('- `' + ev.evidence_hash + '` — ' + ev.request_destination + ' @ ' + formatDate(ev.observed_at));
  }
  lines.push('');

  // Legal context
  lines.push('---');
  lines.push('');
  lines.push('## 6. Applicable Legal Framework');
  lines.push('');
  lines.push('- **CCPA/CPRA (California):** $2,500–$7,500 per violation; GPC is a legally recognized opt-out signal');
  lines.push('- **GDPR (EU/EEA):** Consent required before processing; up to 4% of annual global turnover');
  lines.push('- **ePrivacy Directive:** Prior consent required for non-essential cookies/tracking');
  lines.push('- **FTC Act Section 5:** Deceptive practices when behavior contradicts privacy policy');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*Generated by Violation Index (violationindex.com)*');
  lines.push('*This dossier is evidence-backed and machine-verifiable via the audit trail above.*');

  return lines.join('\n');
}

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function formatNumber(n: number | null): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}
