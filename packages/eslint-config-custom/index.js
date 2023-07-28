module.exports = {
  extends: [
    require.resolve("@vercel/style-guide/eslint/browser"),
    require.resolve("@vercel/style-guide/eslint/react"),
    require.resolve("@vercel/style-guide/eslint/typescript"),
    require.resolve("@vercel/style-guide/eslint/node"),
    "turbo",
    "prettier",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/typescript",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        // use an array
        project: ["apps/**/*/tsconfig.json", "packages/**/*/tsconfig.json"],
      },
    },
  },
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "tsconfig.json",
  },
  rules: {
    "unicorn/prevent-abbreviations": "off",
    "unicorn/filename-case": [
      "error",
      {
        cases: {
          pascalCase: true,
        },
      },
    ],
    "unicorn/switch-case-braces": "off",
    "unicorn/prevent-abbreviations": "off",
    "unicorn/prefer-module": "off",
    "unicorn/prefer-query-selector": "off",
    "unicorn/no-null": "off",
    "unicorn/catch-error-name": "off",
    "unicorn/prefer-export-from": "off",
    "unicorn/prefer-top-level-await": "off",
    "unicorn/no-console-spaces": "off",
    "unicorn/prefer-ternary": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "off",

    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      { assertionStyle: "as" },
    ],
  },
};
