const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "icons/**",
      "node_modules/**",
      "coverage/**",
      ".github/**",
      "eslint.config.js",
      "tools/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
