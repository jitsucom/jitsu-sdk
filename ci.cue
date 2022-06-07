package todoapp

import (
	"dagger.io/dagger"

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
						git: {}
					}
				},
				docker.#Copy & {
					contents: client.filesystem."./".read.contents
					dest:     "/src"
				},
				bash.#Run & {
					workdir: "/src"

					script: contents: #"""
						npm i -g pnpm && pnpm i
					"""#
				}
			]
		}

		"code-style": bash.#Run & {
			input:   deps.output
			workdir: "/src"
			script: contents: #"""
					yarn format:check
				"""#
		}

		build: bash.#Run & {
			input:   deps.output
			workdir: "/src"
			script: contents: #"""
					pnpm build
				"""#
		}

		test: bash.#Run & {
			input:   build.output
			workdir: "/src"
			script: contents: #"""
					pnpm test
				"""#
		}

		"canary-release": bash.#Run & {
			input:   build.output
			workdir: "/src"
			script: contents: #"""
					pnpm release:canary ---publish
				"""#
		}
	}
}