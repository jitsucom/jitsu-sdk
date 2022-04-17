# Jitsu SDK

Jitsu SDK makes it easier to develop custom destinations for [Jitsu](https://github.com/jitsucom/jitsu), an open-source 
event streaming platform.

A custom destinations or sources are called "extensions". The SDK allows to scaffold new extensions, test them and build them. Read
a detailed guide on extendintg Jitsu below

### [Extending Jitsu →](https://jitsu.com/docs/extending)

<hr />

# Maintainer Guide

## Testing and building

* Before starting: `yarn boot` bootstrap workspace, including installing of all software packages (equivalent to `yarn install` — **DO NOT RUN `yarn install` DIRECTLY**).
* `rm -rf \`find . -type d -name node_modules\`` to remove all installed packages and 'reset' the build environment
* `yarn build` runs all subpackages build and tests.
* `yarn jitsu-cli` builds and runs `jitsu-cli`
* `yarn build:no-test` runs only build, without test
* `yarn link-all` runs `npm link` in all packages (run `yarn link`). It's usefull when you want to debug 
your changes with extension
  * Run `yarn link jitsu-cli @jitsu/types` in the extension folder
  * Run `yarn unlink jitsu-cli @jitsu/types && yarn install --force` once you're done
* `yarn ci` builds the project and publishes canary version. It's intended to run within github actions

## Recipes

### To run a source connector 

`yarn jitsu-cli exec-src source-connectors/[source-name] -c {} -s`. The command:
  * Builds `jitsu-cli`
  * Builds source connector with freshly built `jitsu-cli`
  * Runs source connector with given config
  * If you want to skip the `jitsu-cli` build
    * `yarn jitsu-cli:no-build exec-src source-connectors/[source-name] -c {} -s`

Other related commands:
 * `yarn jitsu-cli build source-connectors/[source-name]` - build source connector, do not run it
 * `yarn jitsu-cli test source-connectors/[source-name]` - build source connector, do not run it
 * `yarn build:sources` - build `jitsu-cli` and then all sources with it; alsu runs tests (TODO: implement)

### To add module

**Don't use `yarn add`**!
 * `yarn lerna add @rollup/plugin-inject --scope <package> [--dev]` to add dependency to single package
 * `yarn lerna add @rollup/plugin-inject [--dev]` to add dependency to single package
 * `--dev` adds package as `devDependency`



### How to publish new version

* `npm login`. You need to do it only once. Run `npm whoami` to check if you're already logged in
* `yarn lerna publish` — to bump version and publish. Make sure that all changes are in git



