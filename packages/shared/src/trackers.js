/**
 * Initial hardcoded list of known trackers.
 * Used by the extension to classify third-party requests.
 * Will be expanded via community contribution in later phases.
 */
export const KNOWN_TRACKERS = [
    // Google
    { domain: 'google-analytics.com', category: 'analytics', name: 'Google Analytics' },
    { domain: 'googletagmanager.com', category: 'analytics', name: 'Google Tag Manager' },
    { domain: 'doubleclick.net', category: 'marketing', name: 'Google DoubleClick' },
    { domain: 'googlesyndication.com', category: 'marketing', name: 'Google Ads' },
    { domain: 'googleadservices.com', category: 'marketing', name: 'Google Ad Services' },
    // Meta
    { domain: 'facebook.net', category: 'tracker', name: 'Facebook SDK' },
    { domain: 'connect.facebook.net', category: 'tracker', name: 'Facebook Connect' },
    { domain: 'facebook.com', category: 'tracker', name: 'Facebook Pixel' },
    // Amazon
    { domain: 'amazon-adsystem.com', category: 'marketing', name: 'Amazon Ads' },
    // Criteo
    { domain: 'criteo.com', category: 'marketing', name: 'Criteo' },
    { domain: 'criteo.net', category: 'marketing', name: 'Criteo Network' },
    // Session recording / heatmaps
    { domain: 'hotjar.com', category: 'analytics', name: 'Hotjar' },
    { domain: 'clarity.ms', category: 'analytics', name: 'Microsoft Clarity' },
    // Social / other
    { domain: 'snap.licdn.com', category: 'tracker', name: 'LinkedIn Insight' },
    { domain: 'analytics.tiktok.com', category: 'tracker', name: 'TikTok Analytics' },
    { domain: 'bat.bing.com', category: 'marketing', name: 'Bing UET' },
    { domain: 'sc-static.net', category: 'tracker', name: 'Snapchat Pixel' },
    { domain: 'ads.twitter.com', category: 'marketing', name: 'X/Twitter Ads' },
    { domain: 'ads-api.twitter.com', category: 'marketing', name: 'X/Twitter Ads API' },
    // Ad exchanges
    { domain: 'adnxs.com', category: 'marketing', name: 'Xandr/AppNexus' },
    { domain: 'taboola.com', category: 'marketing', name: 'Taboola' },
    { domain: 'outbrain.com', category: 'marketing', name: 'Outbrain' },
];
/**
 * Check if a URL belongs to a known tracker.
 * Returns the tracker entry if matched, null otherwise.
 */
export function matchTracker(url) {
    let hostname;
    try {
        hostname = new URL(url).hostname.toLowerCase();
    }
    catch {
        return null;
    }
    for (const tracker of KNOWN_TRACKERS) {
        if (hostname === tracker.domain || hostname.endsWith(`.${tracker.domain}`)) {
            return tracker;
        }
    }
    return null;
}
//# sourceMappingURL=trackers.js.map