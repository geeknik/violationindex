import type { TrackerEntry } from './types.js';

/**
 * Known tracker database.
 * Used by the extension to classify third-party requests.
 * Expanded from initial 22 to 60+ entries covering major ad networks,
 * analytics platforms, session recording, retargeting, and data brokers.
 */
export const KNOWN_TRACKERS: readonly TrackerEntry[] = [
  // Google (advertising)
  { domain: 'doubleclick.net', category: 'marketing', name: 'Google DoubleClick' },
  { domain: 'googlesyndication.com', category: 'marketing', name: 'Google Ads' },
  { domain: 'googleadservices.com', category: 'marketing', name: 'Google Ad Services' },
  { domain: 'googleads.g.doubleclick.net', category: 'marketing', name: 'Google Ads Remarketing' },
  { domain: 'pagead2.googlesyndication.com', category: 'marketing', name: 'Google PageAds' },
  { domain: 'adservice.google.com', category: 'marketing', name: 'Google Ad Service' },

  // Google (analytics)
  { domain: 'google-analytics.com', category: 'analytics', name: 'Google Analytics' },
  { domain: 'googletagmanager.com', category: 'analytics', name: 'Google Tag Manager' },
  { domain: 'analytics.google.com', category: 'analytics', name: 'Google Analytics 4' },

  // Meta / Facebook
  { domain: 'facebook.net', category: 'tracker', name: 'Facebook SDK' },
  { domain: 'connect.facebook.net', category: 'tracker', name: 'Facebook Connect' },
  { domain: 'facebook.com', category: 'tracker', name: 'Facebook Pixel' },
  { domain: 'graph.facebook.com', category: 'tracker', name: 'Facebook Graph' },
  { domain: 'pixel.facebook.com', category: 'tracker', name: 'Facebook Pixel Direct' },

  // Amazon
  { domain: 'amazon-adsystem.com', category: 'marketing', name: 'Amazon Ads' },
  { domain: 'assoc-amazon.com', category: 'marketing', name: 'Amazon Associates' },
  { domain: 'fls-na.amazon.com', category: 'tracker', name: 'Amazon FLS' },

  // Microsoft
  { domain: 'bat.bing.com', category: 'marketing', name: 'Bing UET' },
  { domain: 'clarity.ms', category: 'analytics', name: 'Microsoft Clarity' },
  { domain: 'c.bing.com', category: 'marketing', name: 'Bing Ads' },

  // Criteo (retargeting)
  { domain: 'criteo.com', category: 'marketing', name: 'Criteo' },
  { domain: 'criteo.net', category: 'marketing', name: 'Criteo Network' },

  // The Trade Desk
  { domain: 'adsrvr.org', category: 'marketing', name: 'The Trade Desk' },
  { domain: 'match.adsrvr.org', category: 'tracker', name: 'Trade Desk Match' },

  // Ad exchanges / SSPs
  { domain: 'adnxs.com', category: 'marketing', name: 'Xandr/AppNexus' },
  { domain: 'rubiconproject.com', category: 'marketing', name: 'Magnite/Rubicon' },
  { domain: 'pubmatic.com', category: 'marketing', name: 'PubMatic' },
  { domain: 'openx.net', category: 'marketing', name: 'OpenX' },
  { domain: 'casalemedia.com', category: 'marketing', name: 'Index Exchange' },
  { domain: 'indexww.com', category: 'marketing', name: 'Index Exchange' },
  { domain: 'sharethrough.com', category: 'marketing', name: 'Sharethrough' },
  { domain: 'contextweb.com', category: 'marketing', name: 'PulsePoint' },
  { domain: 'bidswitch.net', category: 'marketing', name: 'BidSwitch' },

  // Content recommendation / native ads
  { domain: 'taboola.com', category: 'marketing', name: 'Taboola' },
  { domain: 'outbrain.com', category: 'marketing', name: 'Outbrain' },
  { domain: 'revcontent.com', category: 'marketing', name: 'RevContent' },
  { domain: 'mgid.com', category: 'marketing', name: 'MGID' },

  // Social tracking
  { domain: 'snap.licdn.com', category: 'tracker', name: 'LinkedIn Insight' },
  { domain: 'linkedin.com', category: 'tracker', name: 'LinkedIn Tracking' },
  { domain: 'analytics.tiktok.com', category: 'tracker', name: 'TikTok Analytics' },
  { domain: 'sc-static.net', category: 'tracker', name: 'Snapchat Pixel' },
  { domain: 'ads.twitter.com', category: 'marketing', name: 'X/Twitter Ads' },
  { domain: 'ads-api.twitter.com', category: 'marketing', name: 'X/Twitter Ads API' },
  { domain: 't.co', category: 'tracker', name: 'X/Twitter Redirect Tracker' },
  { domain: 'analytics.pinterest.com', category: 'tracker', name: 'Pinterest Analytics' },
  { domain: 'ct.pinterest.com', category: 'tracker', name: 'Pinterest Conversion' },
  { domain: 'reddit.com', category: 'tracker', name: 'Reddit Pixel' },

  // Session recording / heatmaps
  { domain: 'hotjar.com', category: 'analytics', name: 'Hotjar' },
  { domain: 'mouseflow.com', category: 'analytics', name: 'Mouseflow' },
  { domain: 'fullstory.com', category: 'analytics', name: 'FullStory' },
  { domain: 'logrocket.com', category: 'analytics', name: 'LogRocket' },
  { domain: 'smartlook.com', category: 'analytics', name: 'Smartlook' },
  { domain: 'inspectlet.com', category: 'analytics', name: 'Inspectlet' },
  { domain: 'luckyorange.com', category: 'analytics', name: 'Lucky Orange' },

  // Data management / identity
  { domain: 'demdex.net', category: 'tracker', name: 'Adobe Audience Manager' },
  { domain: 'omtrdc.net', category: 'tracker', name: 'Adobe Analytics' },
  { domain: 'rlcdn.com', category: 'tracker', name: 'LiveRamp' },
  { domain: 'pippio.com', category: 'tracker', name: 'LiveRamp/Pippio' },
  { domain: 'id5-sync.com', category: 'tracker', name: 'ID5' },
  { domain: 'uidapi.com', category: 'tracker', name: 'Unified ID 2.0' },
  { domain: 'liveramp.com', category: 'tracker', name: 'LiveRamp Identity' },

  // Attribution / measurement
  { domain: 'segment.io', category: 'analytics', name: 'Segment' },
  { domain: 'segment.com', category: 'analytics', name: 'Segment' },
  { domain: 'amplitude.com', category: 'analytics', name: 'Amplitude' },
  { domain: 'mixpanel.com', category: 'analytics', name: 'Mixpanel' },
  { domain: 'heapanalytics.com', category: 'analytics', name: 'Heap' },

  // Other ad tech
  { domain: 'quantserve.com', category: 'tracker', name: 'Quantcast' },
  { domain: 'scorecardresearch.com', category: 'tracker', name: 'Scorecard Research' },
  { domain: 'bluekai.com', category: 'tracker', name: 'Oracle BlueKai' },
  { domain: 'addthis.com', category: 'tracker', name: 'AddThis/Oracle' },
  { domain: 'nr-data.net', category: 'analytics', name: 'New Relic' },
  { domain: 'newrelic.com', category: 'analytics', name: 'New Relic' },
] as const;

/**
 * Check if a URL belongs to a known tracker.
 * Returns the tracker entry if matched, null otherwise.
 */
export function matchTracker(url: string): TrackerEntry | null {
  var hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch (e) {
    return null;
  }

  for (var i = 0; i < KNOWN_TRACKERS.length; i++) {
    var tracker = KNOWN_TRACKERS[i]!;
    if (hostname === tracker.domain || hostname.endsWith('.' + tracker.domain)) {
      return tracker;
    }
  }
  return null;
}
