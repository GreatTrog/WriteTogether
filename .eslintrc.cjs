const path = require("path");

module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
      path.resolve(__dirname, "tsconfig.base.json"),
      path.resolve(__dirname, "apps/*/tsconfig.json"),
      path.resolve(__dirname, "packages/*/tsconfig.json"),
    ],
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react-refresh", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "@typescript-eslint/explicit-function-return-type": "off",
    "react-refresh/only-export-components": "warn",
  },
  ignorePatterns: ["dist", "build", "node_modules"],
};
