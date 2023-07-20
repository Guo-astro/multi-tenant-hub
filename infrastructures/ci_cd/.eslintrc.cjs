module.exports = {
  extends: "@multi-tenent-hub/eslint-config-custom",
  parserOptions: {
    root: true,
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  ignorePatterns: ["scripts/**/*", "vite.config.ts","*.cjs"],
};
