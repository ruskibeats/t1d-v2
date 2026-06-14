const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo to resolve hoisted packages and other workspaces
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'sparky-bloom/node_modules'),
];

// Map .js imports to .ts for TypeScript ESM compatibility in the shared workspace
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js')) {
    const tsModuleName = moduleName.replace(/\.js$/, '');
    try {
      return context.resolveRequest(context, tsModuleName, platform);
    } catch (e) {
      // Ignore and fallback to default resolution
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Resolve @workspace/shared to the shared package source
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@workspace/shared': path.resolve(__dirname, '../sparky-bloom/shared/src'),
};

module.exports = config;
