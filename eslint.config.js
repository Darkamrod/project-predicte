const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  {
    ignores: [
      ".expo/**",
      "*.config.cjs",
      "*.config.js",
      "babel.config.js",
      "coverage/**",
      "dist/**",
      "eslint.config.js",
      "node_modules/**",
      "prettier.config.cjs",
      "supabase/functions/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "no-undef": "off"
    }
  }
];
