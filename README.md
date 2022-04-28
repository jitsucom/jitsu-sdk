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
* `yarn ci` runs all builds and tests (same as CI - see `ci.cue`)
* `yarn build:core`, `yarn build:sources` and `yarn build:all` builds and runs build of core, sources and everything respectively
* `yarn test:all` runs all tests

## Project structure

* `core/*` - core packages of jitsu sdk
* `source-connector/*` - officially supported source connectors
* `destinations/*` - officially supported destinations (*TODO*) 

## Recipes

### To run a source connector 

`yarn jitsu-cli extension exec-src -d source-connectors/[source-name] -c {} -s`. The command:
  * Builds `jitsu-cli`
  * Builds source connector with freshly built `jitsu-cli`
  * Runs source connector with given config

Other related commands:
 * `yarn jitsu-cli build source-connectors/[source-name]` - build source connector, do not run it
 * `yarn jitsu-cli test source-connectors/[source-name]` - build source connector, do not run it


### To add module

**Don't use `yarn add`**!
 * `yarn lerna add <module> --scope <package> [--dev]` to add dependency to single package. Run `yarn lerna list` to get a list of available packages (scopes)
 * `yarn lerna add <module> [--dev]` to add dependency all packages
 * `--dev` adds package as `devDependency`



### How to publish new version

* `npm login`. You need to do it only once. Run `npm whoami` to check if you're already logged in
* `yarn lerna publish` — to bump version and publish. Make sure that all changes are in git



