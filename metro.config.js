const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Required for pnpm symlink resolution
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: './global.css' });
