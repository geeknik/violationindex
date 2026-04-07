import type { ViolationBundle } from './types.js';

/**
 * Generate a journalist brief — story-ready 1-pager.
 * Hook + evidence summary + impact + quotes-ready facts.
 */
export function generateJournalistBrief(bundle: ViolationBundle): string {
  var v = bundle.violation;
  var destinations = new Set(bundle.evidence.map(function(e) { return e.request_destination; }));
  var destList = Array.from(destinations);

  var typeLabel = v.violation_type === 'preconsent_marketing_transfer'
    ? 'tracks users before they consent' : 'ignores browser privacy signals';

  var lines: string[] = [];

  lines.push('# JOURNALIST BRIEF');
  lines.push('');
  lines.push('**EMBARGOED UNTIL FURTHER NOTICE**');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Headline
  lines.push('## ' + v.site_domain + ' ' + typeLabel);
  lines.push('');

  // Lead
  lines.push('**' + v.site_domain + '** sends user data to ' + destList.length +
    ' third-party marketing service' + (destList.length > 1 ? 's' : '') +
    ' before visitors interact with any consent mechanism, according to ' +
    v.evidence_count + ' evidence record' + (v.evidence_count > 1 ? 's' : '') +
    ' collected by Violation Index.');
  lines.push('');

  // Key facts
  lines.push('### Key Facts');
  lines.push('');
  lines.push('- **What:** ' + (v.violation_type === 'preconsent_marketing_transfer'
    ? 'Marketing trackers fire before consent banner interaction'
    : 'GPC opt-out signal ignored; marketing data still transferred'));
  lines.push('- **Who:** ' + v.site_domain);
  lines.push('- **Evidence:** ' + v.evidence_count + ' documented instance(s) across ' +
    v.session_count + ' session(s)');
  lines.push('- **Third parties receiving data:** ' + destList.join(', '));
  lines.push('- **First observed:** ' + formatDate(v.first_observed));
  lines.push('- **Severity:** ' + v.severity.toUpperCase());
  if (v.estimated_users) {
    lines.push('- **Estimated affected users:** ' + formatNumber(v.estimated_users) + '/month');
  }
  if (v.estimated_exposure_min) {
    lines.push('- **Estimated regulatory exposure:** $' + formatNumber(v.estimated_exposure_min) +
      ' — $' + formatNumber(v.estimated_exposure_max));
  }
  lines.push('');

  // Context
  lines.push('### Context');
  lines.push('');
  if (v.violation_type === 'preconsent_marketing_transfer') {
    lines.push('Under GDPR, ePrivacy Directive, and CCPA/CPRA, websites must obtain user');
    lines.push('consent before deploying non-essential tracking technologies. The evidence');
    lines.push('shows that ' + v.site_domain + ' initiates data transfers to advertising');
    lines.push('networks in the milliseconds after page load — before any consent banner');
    lines.push('is displayed or interacted with.');
  } else {
    lines.push('Global Privacy Control (GPC) is a browser-level signal that communicates');
    lines.push("a user's opt-out preference. Under California's CPRA, businesses must");
    lines.push('treat GPC as a valid opt-out request. The evidence shows that');
    lines.push(v.site_domain + ' continues transferring data to marketing services');
    lines.push('despite receiving the GPC signal.');
  }
  lines.push('');

  // Comparable cases
  lines.push('### Comparable Enforcement Actions');
  lines.push('');
  lines.push('- GoodRx — FTC: $25M (sharing health data with advertisers)');
  lines.push('- Sephora — CA AG: $1.2M (failing to process opt-out signals)');
  lines.push('- BetterHelp — FTC: $7.8M (sharing therapy data with advertisers)');
  lines.push('');

  // For more
  lines.push('### Resources');
  lines.push('');
  lines.push('- Full evidence dossier available on request');
  lines.push('- Public record: https://violationindex.com');
  lines.push('- Contact: b@deepforkcyber.com');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('*Prepared by Violation Index — the public record of privacy misconduct*');

  return lines.join('\n');
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
