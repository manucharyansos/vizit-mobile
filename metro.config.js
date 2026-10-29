const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-router's query-string@7 requires decode-uri-component@0.2, which has
// GHSA-vcc3-ghjq-m6fr and GHSA-qr28-fpjm-wq7f. The fixed 0.5.1 is ESM-only, so
// the app bundles a CommonJS copy of 0.5.1 instead (see vendor/).
const patched = {
  'decode-uri-component': path.resolve(__dirname, 'vendor/decode-uri-component/index.js'),
};
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (patched[moduleName]) return { type: 'sourceFile', filePath: patched[moduleName] };
  return upstreamResolve ? upstreamResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
