# Jitsu SDK (alpha)

This is an alpha version of [Jitsu](https://github.com/jitsucom/jitsu) SDK. It contains a few packages that solves
different challenges with Jitsu extensibility

* **Jitsu CLI** — a CLI interface for developing jitsu plugins, published as an [npm package](https://www.npmjs.com/package/@jitsu/jitsu-cli). At the moment,
only destination development works (`jitsu destination build`, `jitsu destination test` and soon `npx jitsu destination create`)
* **Jitsu Tracking SDK** (not moved here yet, see [main repo](https://github.com/jitsucom/jitsu/tree/master/javascript-sdk))

## Implementing Jitsu destination

```shell
npx jitsu destination create
```

Will create an empty project. Then run:

* `yarn build` to build a destination
* `yarn test` to run tests

`yarn build` and `yarn test` are just wrappers around `jitsu destination build` and `jitsu destination test`

Destinations implemeted with this SDK:
* [Mixpanel Destination](https://github.com/jitsucom/jitsu-mixpanel)
* June.so (not published yet)

## Maintainer Guide

### How to publish new version

