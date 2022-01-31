# Jitsu SDK (alpha)

This is an alpha version of [Jitsu](https://github.com/jitsucom/jitsu) extension SDK. 
It contains a few packages that build, test and execute jitsu extensions

* **Jitsu CLI** — a CLI interface for developing jitsu extensions, published as an [npm package](https://www.npmjs.com/package/jitsu-cli).

Run `npx jitsu-cli` 

## Implementing Jitsu destination

```shell
npx jitsu-cli extension create --type destination
```

```shell
npx jitsu-cli extension create --type transformation
```

Will create an empty project. Depending on `--type`, it will be either `destination` extension, or `transformation` extension

Run:

* `yarn build` to build an extension
* `yarn test` to run tests

`yarn build` and `yarn test` are just wrappers around `jitsu-cli extension build` and `jitsu-cli extension test`

Destinations implemeted with this SDK:
* [Mixpanel Destination](https://github.com/jitsucom/jitsu-mixpanel)
* June.so (not published yet)

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

* `npm login`. You need to do it only once.
* `yarn lerna publish`



