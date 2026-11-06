const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Monorepo-lite: the app imports shared domain code from the repo root
// (../lib, ../locales). Watching the parent lets Metro resolve + hot-reload it.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
