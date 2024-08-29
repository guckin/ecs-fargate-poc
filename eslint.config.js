import tseslint from "typescript-eslint";

export default [
    {
        files: ["**/*.{ts}"],
    },
    {
        ignores: ["**/*.{mjs,js,d.ts}", "bundle/**/*", "dist/**/*", "cdk.out/**/*"],
    },
    {
        rules: {
            "no-unused-vars": ["error", {
                "vars": "all",
                "args": "after-used",
                "caughtErrors": "all",
                "ignoreRestSiblings": false,
                "reportUsedIgnorePattern": false
            }]
        }
    },
    ...tseslint.configs.recommended,
];
