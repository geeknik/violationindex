import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = `${__dirname}/build`;

// Ensure output directories exist
mkdirSync(`${outdir}/content`, { recursive: true });
mkdirSync(`${outdir}/popup`, { recursive: true });

// Bundle each entry point separately to control output paths
await Promise.all([
  // Background script → build/background.js (root level)
  esbuild.build({
    entryPoints: [`${__dirname}/src/background.ts`],
    bundle: true,
    outfile: `${outdir}/background.js`,
    format: 'iife',
    target: 'es2018',
    platform: 'browser',
    minify: false,
    sourcemap: false,
    treeShaking: true,
    logLevel: 'info',
  }),
  // Content script: consent detection → build/content/consent-probe.js
  esbuild.build({
    entryPoints: [`${__dirname}/content/consent-probe.ts`],
    bundle: true,
    outfile: `${outdir}/content/consent-probe.js`,
    format: 'iife',
    target: 'es2018',
    platform: 'browser',
    minify: false,
    sourcemap: false,
    treeShaking: true,
    logLevel: 'info',
  }),
  // Content script: storage monitoring → build/content/storage-probe.js
  esbuild.build({
    entryPoints: [`${__dirname}/content/storage-probe.ts`],
    bundle: true,
    outfile: `${outdir}/content/storage-probe.js`,
    format: 'iife',
    target: 'es2018',
    platform: 'browser',
    minify: false,
    sourcemap: false,
    treeShaking: true,
    logLevel: 'info',
  }),
  // Popup script → build/popup/popup.js
  esbuild.build({
    entryPoints: [`${__dirname}/popup/popup.ts`],
    bundle: true,
    outfile: `${outdir}/popup/popup.js`,
    format: 'iife',
    target: 'es2018',
    platform: 'browser',
    minify: false,
    sourcemap: false,
    treeShaking: true,
    logLevel: 'info',
  }),
]);

// Copy static files
cpSync(`${__dirname}/popup/popup.html`, `${outdir}/popup/popup.html`);

// Write manifest with corrected paths
const manifest = {
  manifest_version: 3,
  name: "consent.watch",
  version: "0.1.0",
  description: "Detect pre-consent tracking violations. See which sites track you before you consent.",
  permissions: ["webRequest", "webNavigation", "storage", "tabs", "activeTab"],
  host_permissions: ["<all_urls>"],
  background: {
    scripts: ["background.js"]
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/consent-probe.js"],
      run_at: "document_start"
    },
    {
      matches: ["<all_urls>"],
      js: ["content/storage-probe.js"],
      run_at: "document_start"
    }
  ],
  action: {
    default_popup: "popup/popup.html",
    default_title: "consent.watch"
  },
  browser_specific_settings: {
    gecko: {
      id: "extension@consent.watch",
      strict_min_version: "128.0"
    }
  }
};

const { writeFileSync } = await import('fs');
writeFileSync(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2));

console.log('Extension built to ./build/');
