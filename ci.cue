package todoapp

import (
	"dagger.io/dagger"
	"dagger.io/dagger/core"
	"universe.dagger.io/alpine"
	"universe.dagger.io/bash"
	"universe.dagger.io/docker"
)

dagger.#Plan & {
	client: {
		filesystem: {
			"./": read: {
				contents: dagger.#FS
				exclude: [
					"README.md",
					"_build",
					"dagger.cue",
					"node_modules",
				]
			}
			//"./_build": write: contents: actions.build.contents.output
		}
	}
	actions: {
		deps: docker.#Build & {
			steps: [
				alpine.#Build & {
					packages: {
						bash: {}
						//we do not need npm for build, but it's required for test
						npm: {}
						yarn: {}
						git: {}
					}
				},
				docker.#Copy & {
					contents: client.filesystem."./".read.contents
					dest:     "/src"
				},
				bash.#Run & {
					workdir: "/src"
					mounts: {
						"/cache/yarn": {
							dest:     "/cache/yarn"
							type:     "cache"
							contents: core.#CacheDir & {
								id: "jitsu-sdk-yarn-cache"
							}
						}
					}

					script: contents: #"""
						yarn boot
					"""#
				}
			]
		}

		"code-style": bash.#Run & {
			input:   deps.output
			workdir: "/src"
			script: contents: #"""
					yarn prettier:check
				"""#
		}

		build: bash.#Run & {
			input:   deps.output
			workdir: "/src"
			script: contents: #"""
					yarn build:all
				"""#
		}

		test: bash.#Run & {
			input:   build.output
			workdir: "/src"
			script: contents: #"""
					yarn test:all
				"""#
		}
	}
}