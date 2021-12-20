# Jitsu SDK (alpha)

This is an alpha version of [Jitsu](https://github.com/jitsucom/jitsu) extension SDK. 
It contains a few packages that build, test and execute jitsu extensions

* **Jitsu CLI** — a CLI interface for developing jitsu extensions, published as an [npm package](https://www.npmjs.com/package/@jitsu/jitsu-cli). 
See run `jitsu extension build`, `jitsu extension build` and soon `npx @jitsu/cli extension build`)

## Implementing Jitsu destination

```shell
npx jitsu extension create --type destination
```

```shell
npx jitsu extension create --type transformation
```

Will create an empty project. Depending on `--type`, it will be either `destination` extension, or `transformation` extension

Run:

* `yarn build` to build an extension
* `yarn test` to run tests

`yarn build` and `yarn test` are just wrappers around `jitsu extension build` and `jitsu extension test`

Destinations implemeted with this SDK:
* [Mixpanel Destination](https://github.com/jitsucom/jitsu-mixpanel)
* June.so (not published yet)

<hr />

## Maintainer Guide

### Testing and building

### How to publish new version

* `npm login`. You need to do it only once
* `yarn lerna:boot`, then `yarn lerna:publish`



