#!/usr/bin/env node
// Fails on high/critical advisories like `npm audit --audit-level=high`, except an
// advisory whose vulnerable package the app replaces at bundle time (metro.config.js).
const { execFileSync } = require('node:child_process');

const replacedInBundle = {
  'decode-uri-component': ['GHSA-vcc3-ghjq-m6fr', 'GHSA-qr28-fpjm-wq7f'],
};

let report;
try {
  report = JSON.parse(execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
} catch (error) {
  report = JSON.parse(error.stdout);
}

const blocking = [];
for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of entry.via) {
    if (typeof via !== 'object' || !['high', 'critical'].includes(via.severity)) continue;
    const id = String(via.url ?? '').split('/').pop();
    if (replacedInBundle[via.name]?.includes(id)) continue;
    blocking.push(`${name}: ${via.title} (${via.severity}) ${via.url}`);
  }
}

if (blocking.length) {
  console.error(`High or critical advisories:\n${[...new Set(blocking)].join('\n')}`);
  process.exit(1);
}
console.log('No unhandled high or critical advisories.');
