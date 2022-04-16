import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";
const typescriptPlugin = typescript();

export default [
  {
    input: "./src/*",
    plugins: [typescriptPlugin, json()],
    output: [
      { file: "lib/index.js", format: "cjs" },
      { file: "lib/index.es.js", format: "es" },
    ],
  },
];
