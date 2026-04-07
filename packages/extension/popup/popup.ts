/**
 * Extension popup: shows violations for the active tab
 * and provides user-controlled evidence submission.
 */

interface TabSummary {
  total: number;
  preConsent: number;
  postConsent: number;
  domain: string | null;
}

interface CapturedRequest {
  url: string;
  destination: string;
  requestType: string;
  trackerName: string;
  capturedAt: number;
  consentStateAtCapture: string;
}

console.log('[popup] Loading...');

const domainEl = document.getElementById('domain') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;
const preConsentEl = document.getElementById('pre-consent-count') as HTMLElement;
const totalEl = document.getElementById('total-count') as HTMLElement;
const violationsEl = document.getElementById('violations') as HTMLElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const detailsBtn = document.getElementById('details-btn') as HTMLButtonElement;

async function loadTabData(): Promise<void> {
  console.log('[popup] Requesting tab summary...');
  try {
    const summary = await browser.runtime.sendMessage({ type: 'getTabSummary' }) as TabSummary;
    console.log('[popup] Got summary:', JSON.stringify(summary));

    if (!summary) {
      statusEl.textContent = 'no response';
      console.error('[popup] summary is null/undefined');
      return;
    }

    if (summary.domain) {
      domainEl.innerHTML = escapeHtml(summary.domain) + ' <span>' + summary.total + ' requests tracked</span>';
    } else {
      domainEl.innerHTML = '— <span>no active page</span>';
    }

    preConsentEl.textContent = String(summary.preConsent);
    totalEl.textContent = String(summary.total);

    if (summary.preConsent > 0) {
      statusEl.textContent = summary.preConsent + ' violation' + (summary.preConsent > 1 ? 's' : '');
      statusEl.style.color = '#d42020';
      submitBtn.disabled = false;
    } else if (summary.total > 0) {
      statusEl.textContent = 'no pre-consent issues';
      statusEl.style.color = '#666';
    } else {
      statusEl.textContent = 'scanning...';
    }

    // Load detailed violations
    console.log('[popup] Requesting pre-consent requests...');
    const requests = await browser.runtime.sendMessage({ type: 'getPreConsentRequests' }) as CapturedRequest[];
    console.log('[popup] Got requests:', requests ? requests.length : 'null');
    renderViolations(requests || []);
  } catch (err) {
    statusEl.textContent = 'error';
    console.error('[popup] Failed to load tab data:', err);
  }
}

function renderViolations(requests: readonly CapturedRequest[]): void {
  if (requests.length === 0) {
    violationsEl.innerHTML = '<div class="empty">No pre-consent violations detected.</div>';
    return;
  }

  violationsEl.innerHTML = requests
    .map(function(req) {
      var time = formatTime(req.capturedAt);
      return '<div class="violation">' +
        '<span class="violation-dest">' + escapeHtml(req.destination) + '</span>' +
        '<span class="violation-time">' + time + '</span>' +
        '<div class="violation-name">' + escapeHtml(req.trackerName) + ' &middot; ' + escapeHtml(req.requestType) + '</div>' +
      '</div>';
    })
    .join('');
}

function formatTime(timestamp: number): string {
  var date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(text: string): string {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Submit button handler — user-controlled upload
submitBtn.addEventListener('click', async function() {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    var response = await browser.runtime.sendMessage({ type: 'submitEvidence' }) as { accepted?: number } | null;
    if (response && typeof response.accepted === 'number') {
      submitBtn.textContent = response.accepted + ' submitted';
      setTimeout(function() {
        submitBtn.textContent = 'Submit Evidence';
        submitBtn.disabled = false;
      }, 2000);
    }
  } catch (err) {
    submitBtn.textContent = 'Failed';
    console.error('[popup] Submit error:', err);
    setTimeout(function() {
      submitBtn.textContent = 'Submit Evidence';
      submitBtn.disabled = false;
    }, 2000);
  }
});

// Details button — open full record on violationindex.com
detailsBtn.addEventListener('click', function() {
  browser.tabs.create({ url: 'https://violationindex.com' });
});

// Load data on popup open
console.log('[popup] Calling loadTabData...');
loadTabData();
