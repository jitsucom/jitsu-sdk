import multi from "@rollup/plugin-multi-entry";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import rollupJson from "@rollup/plugin-json";

export default [
  {
    input: "./script.js",
    plugins: [multi(), resolve({ preferBuiltins: false }), commonjs(), rollupJson()],
    output: [{ file: "bin/go-source-bridge.js", format: "cjs" }],
  },
];
