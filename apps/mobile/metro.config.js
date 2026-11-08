// Metro configuration for the Recall iPhone app.
//
// apps/mobile is a standalone npm project (deliberately NOT a root workspace),
// but it bundles the shared TypeScript sources in ../../packages (linked into
// node_modules with "file:" dependencies). Two things make that work:
//
// 1. watchFolders includes ../../packages, so Metro can see and transform the
//    linked sources (their real paths are outside this folder).
// 2. Bare imports made from inside ../../packages (e.g. "zod", "@recall/core")
//    are resolved from apps/mobile/node_modules only. That keeps one copy of
//    each dependency and never picks up a repo-root node_modules created by the
//    web app's workspace install. (Metro already skips folders it does not
//    watch; this rule keeps it that way even if watchFolders is widened.)
//
// The "paths" in tsconfig.json do the same job for the type checker only;
// app.json sets experiments.tsconfigPaths = false so they do not change
// Metro's resolution.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const packagesRoot = path.resolve(projectRoot, '../../packages');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), packagesRoot];
config.resolver.nodeModulesPaths = [appNodeModules];

// getDefaultConfig() sets no custom resolver of its own, so chain to
// context.resolveRequest (Expo's resolvers, then Metro's default), as documented.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = context.resolveRequest;
  const fromSharedPackage = context.originModulePath.startsWith(packagesRoot + path.sep);
  const isBareImport = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
  if (fromSharedPackage && isBareImport) {
    // Resolve as if the import were written in apps/mobile itself.
    return resolve({ ...context, originModulePath: path.join(projectRoot, 'package.json') }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
