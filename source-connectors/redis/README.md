# Redis connector for Jitsu

This dir contains an redis connector to jitsu

<hr />

## Dev tips

Run

```
# To download all redis, maybe VERY resource consuming
yarn execute  -c "{host:'XXX', port: 6379, password: 'XXXX', username: 'XXX''}"

# To download particular key
yarn execute  -c "{host:'XXX', port: 6379, password: 'XXXX', username: 'XXX''}" -s "{redis_key: 'XXXX'}"

# To download key by pattern (can be long too)
yarn execute  -c "{host:'XXX', port: 6379, password: 'XXXX', username: 'XXX''}" -s "{redis_key: 'XXXX'}"

```
