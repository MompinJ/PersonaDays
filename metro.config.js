// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite en web usa wa-sqlite, que se distribuye como .wasm.
// Metro necesita tratar .wasm como asset para resolverlo.
config.resolver.assetExts.push('wasm');

// wa-sqlite (OPFS / SharedArrayBuffer) requiere estas cabeceras en el dev server web.
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  };
};

module.exports = config;
