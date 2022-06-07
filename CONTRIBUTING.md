# Jitsu SDK Contributors handbook

## Prerequisites and Build Stack

Please make sure you have the following installed before starting:

 * `pnpm` (>3)
 * `node` (>14)

Internally, Jitsu SDK uses:

 * [Husky](https://typicode.github.io/husky/#/) to execute pre-commit hooks
 * [PNPM workspaces](https://pnpm.io/workspaces) to manage internal dependencies
 * [Turborepo](https://turborepo.org/) to run builds and test

## Commands

### Develop and build

* `pnpm install` - to install all dependencies
* `pnpm clean` - to clean all artifacts
* `pnpm factory-reset` - to do a "factory reset": remove all installed dependencies, etc
* `pnpm build` - build all packages
* `pnpm test` - test all packages
* `pnpm format:check` - check code style (with prettier)
* `pnpm format` - fix code style (with prettier)

### Release

Make sure you are logged in to npm with `npm whoami`

* `pnpm release --stable X.Y.Z --publish` - to make a stable release 
* `pnpm release:canary --publish` - to make a canary release. The version will be `X.Y.Z.alpha.N`. See the current value for `X.Y.Z` in `package.json`

Run without `--publish` to dry run.

### Integrations

* Husky runs `pnpm pre-commit` before each commit. Currently `pre-commit` only checks code format with prettier. Run it separately to with `pnpm format:check`
* Dagger runs `pnpm ci`. This command: 
  * Runs build and test
  * Publishes canary version to npm


