const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve @workspace/shared to the shared package source
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@workspace/shared': path.resolve(__dirname, '../sparky-bloom/shared/src'),
};

// Ensure the shared package is watched for changes
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../sparky-bloom/shared/src'),
];

module.exports = config;
