# Jitsu SDK

Jitsu SDK makes it easier to develop custom destinations for [Jitsu](https://github.com/jitsucom/jitsu), an open-source 
event streaming platform.

A custom destinations or sources are called "extensions". The SDK allows to scaffold new extensions, test them and build them. Read
a detailed guide on extendintg Jitsu below

### [Extending Jitsu →](https://jitsu.com/docs/extending)

<hr />

## Maintainer Guide

### Testing and building

* `yarn lerna:boot` bootstrap workspace  **Run before build**
* `yarn build` runs all subpackages build and tests. **Run before all tests**
* `yarn build-only` runs only build, without test
* `yarn link-all` runs `npm link` in all packages (run `yarn link`). It's usefull when you want to debug 
your changes with extension
  * Run `yarn link jitsu-cli @jitsu/types` in the extension folder
  * Run `yarn unlink jitsu-cli @jitsu/types && yarn install --force` once you're done
* `yarn ci` builds the project and publishes canary version. It's intended to run within github actions

### How to publish new version

* `npm login`. You need to do it only once. Run `npm whoami` to check if you're already logged in
* `yarn lerna publish` — to bump version and publish. Make sure that all changes are in git



