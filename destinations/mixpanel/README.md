# Mixpanel Destination for Jitsu

Implementation of Mixpanel destination for [Jitsu](https://jitsu.com)
based on an alpha version of [Jitsu SDK](https://github.com/jitsucom/jitsu-sdk).

## Using

Install all dependencies for a project
```shell
yarn install
```

Build destination
```shell
yarn build
```

Run tests
```shell
yarn test
```

If everything is ok - resulted destination file location
```shell
./dist/mixpanel-destination.js
```

Validate destination config:

with json string:
```shell
yarn validate-config --config-object '{"api_secret": "abc","token": "def", "project_id": "123"}'
```
with json file:
```shell
yarn validate-config --config config.json
```
