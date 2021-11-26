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

Will create an empty project _(todo)_

Examples:
* [Mixpanel Destination](https://github.com/jitsucom/jitsu-mixpanel) 

