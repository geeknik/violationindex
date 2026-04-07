import type { ViolationBundle } from './types.js';

/**
 * Generate a regulator complaint packet.
 * Formatted for FTC, state AG, and DPA complaint filing.
 */
export function generateRegulatorPacket(bundle: ViolationBundle): string {
  var v = bundle.violation;
  var destinations = new Set(bundle.evidence.map(function(e) { return e.request_destination; }));
  var gpcEvidence = bundle.evidence.filter(function(e) { return e.gpc_active; });

  var lines: string[] = [];

  lines.push('# REGULATORY COMPLAINT PACKET');
  lines.push('');
  lines.push('**Prepared for submission to applicable regulatory authorities**');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Complainant
  lines.push('## I. Complainant Information');
  lines.push('');
  lines.push('**Organization:** Violation Index');
  lines.push('**Website:** https://violationindex.com');
  lines.push('**Contact:** b@deepforkcyber.com');
  lines.push('**Date:** ' + new Date().toISOString().split('T')[0]);
  lines.push('');

  // Subject
  lines.push('## II. Subject of Complaint');
  lines.push('');
  lines.push('**Website:** ' + v.site_domain);
  lines.push('**Violation Type:** ' + formatViolationType(v.violation_type));
  lines.push('**Severity:** ' + v.severity.toUpperCase());
  lines.push('**Reference ID:** VI-' + v.id);
  lines.push('');

  // Summary
  lines.push('## III. Summary of Violation');
  lines.push('');
  if (v.violation_type === 'preconsent_marketing_transfer') {
    lines.push('The website ' + v.site_domain + ' deploys third-party marketing and tracking');
    lines.push('technologies that transmit user data to ' + destinations.size + ' external service(s)');
    lines.push('before presenting any consent mechanism to the user or before the user has');
    lines.push('interacted with such mechanism. This practice contradicts representations');
    lines.push('made in the site\'s privacy policy and violates applicable data protection laws');
    lines.push('requiring prior informed consent for non-essential data processing.');
  } else {
    lines.push('The website ' + v.site_domain + ' fails to honor the Global Privacy Control (GPC)');
    lines.push('signal transmitted by the user\'s browser. Despite receiving a GPC signal');
    lines.push('indicating the user\'s opt-out preference, the site continues to transmit');
    lines.push('user data to ' + destinations.size + ' third-party marketing service(s).');
    lines.push('Under CCPA/CPRA, businesses are required to treat GPC as a valid opt-out request.');
  }
  lines.push('');

  // Evidence
  lines.push('## IV. Evidence');
  lines.push('');
  lines.push('### A. Observed Data Transfers');
  lines.push('');
  lines.push(v.evidence_count + ' instance(s) of unauthorized data transfer were documented');
  lines.push('across ' + v.session_count + ' browsing session(s).');
  lines.push('');
  lines.push('**Observation period:** ' + formatDate(v.first_observed) + ' to ' + formatDate(v.last_observed));
  lines.push('');
  lines.push('**Third-party recipients:**');
  lines.push('');
  destinations.forEach(function(d) {
    lines.push('- ' + d);
  });
  lines.push('');

  // GPC-specific evidence
  if (gpcEvidence.length > 0) {
    lines.push('### B. Global Privacy Control Evidence');
    lines.push('');
    lines.push(gpcEvidence.length + ' request(s) were observed while the browser\'s GPC signal');
    lines.push('(`Sec-GPC: 1` / `navigator.globalPrivacyControl = true`) was active.');
    lines.push('');
  }

  // Consent mechanism
  var mechanisms = new Set(bundle.evidence.map(function(e) { return e.consent_mechanism; }));
  lines.push('### ' + (gpcEvidence.length > 0 ? 'C' : 'B') + '. Consent Mechanism Status');
  lines.push('');
  lines.push('**Consent mechanism(s) detected:** ' + Array.from(mechanisms).join(', '));
  lines.push('**Consent state at time of violation:** pre_consent (no user interaction)');
  lines.push('');

  // TCF
  var tcf = bundle.evidence.find(function(e) { return e.tcf_consent_string !== null; });
  if (tcf) {
    lines.push('**IAB TCF consent string:** `' + (tcf.tcf_consent_string || 'empty') + '`');
    lines.push('An empty TCF consent string confirms no consent purposes were granted.');
    lines.push('');
  }

  // Chain of custody
  lines.push('### Evidence Integrity');
  lines.push('');
  lines.push('All evidence records are individually SHA-256 hashed. The audit trail');
  lines.push('is hash-chained (each entry includes the hash of the previous entry),');
  lines.push('creating a tamper-evident record. Modification of any entry invalidates');
  lines.push('all subsequent entries in the chain.');
  lines.push('');

  // Applicable law
  lines.push('## V. Applicable Legal Framework');
  lines.push('');
  lines.push('### Federal (United States)');
  lines.push('- **FTC Act, Section 5:** Prohibits unfair or deceptive acts or practices.');
  lines.push('  A privacy policy that claims consent-based data collection while the');
  lines.push('  site collects data without consent constitutes a deceptive practice.');
  lines.push('');
  lines.push('### State (California)');
  lines.push('- **CCPA/CPRA (Cal. Civ. Code 1798.100 et seq.):** Requires businesses to');
  lines.push('  honor opt-out requests. GPC constitutes a valid opt-out signal.');
  lines.push('- **Penalties:** $2,500 per unintentional violation; $7,500 per intentional violation.');
  lines.push('');
  lines.push('### European Union');
  lines.push('- **GDPR (Regulation 2016/679):** Article 6 — lawful basis required for processing.');
  lines.push('  Article 7 — consent must be freely given, specific, informed, and unambiguous.');
  lines.push('- **ePrivacy Directive (2002/58/EC):** Article 5(3) — prior consent required');
  lines.push('  for storing or accessing information on a user\'s terminal equipment.');
  lines.push('- **Penalties:** Up to 4% of annual global turnover or EUR 20 million.');
  lines.push('');

  // Relief requested
  lines.push('## VI. Relief Requested');
  lines.push('');
  lines.push('1. Investigation of ' + v.site_domain + '\'s data collection practices');
  lines.push('2. Determination of the scope of affected consumers');
  lines.push('3. Enforcement action to cease unauthorized data collection');
  lines.push('4. Civil penalties as appropriate under applicable law');
  lines.push('');

  // Attachments
  lines.push('## VII. Attachments');
  lines.push('');
  lines.push('- Full evidence dossier (VI-' + v.id + ')');
  lines.push('- Hash-chained audit trail');
  if (bundle.policySnapshots.length > 0) {
    lines.push('- Privacy policy snapshot(s) with SHA-256 verification hash');
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*Prepared by Violation Index (violationindex.com)*');

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
