const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Prevent Metro from looking at parent directory's node_modules
// (the parent T1D project has Expo SDK 56 which conflicts with SDK 54)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

config.watchFolders = [projectRoot];

module.exports = config;
