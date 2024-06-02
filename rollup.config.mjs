import commonjs from "@rollup/plugin-commonjs"
import swc from "@rollup/plugin-swc"
import resolve from "@rollup/plugin-node-resolve"
import json from "@rollup/plugin-json"

// include these packages in the bundle
// usually because they don't play nice with ESM at runtime
const includePackages = ["ix", "tslib"]
const includePackagesExps = includePackages.map(
  (i) => new RegExp("node_modules/(.+?/)?" + i),
)

/** @type {import('rollup').RollupOptions} */
export default {
  input: ["src/index.ts", "src/script.ts"],
  plugins: [
    resolve({
      preferBuiltins: true,
      extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    }),
    commonjs(),
    json(),
    swc(),
  ],
  external: (source, importer, isResolved) => {
    return (
      isResolved &&
      source.includes("node_modules") &&
      !includePackagesExps.some((i) => source.match(i))
    )
  },
  output: {
    dir: "dist",
    format: "esm",
  },
}
