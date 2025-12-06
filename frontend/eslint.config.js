import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    {
        ignores: ['dist/**', 'build/**', 'node_modules/**'],
    },

    {
        files: ['src/**/*.{ts,tsx,js,jsx}'],

        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },

        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettierPlugin,
            'better-tailwindcss': betterTailwindcss,
        },

        settings: {
            'better-tailwindcss': {
                entryPoint: 'src/styles/globals.css',
            },
        },

        rules: {
            ...js.configs.recommended.rules,

            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            'no-dupe-class-members': 'off',
            'no-undef': 'off',

            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/consistent-type-definitions': ['off'],

            'better-tailwindcss/no-duplicate-classes': 'warn',
            'better-tailwindcss/no-deprecated-classes': 'warn',
            'better-tailwindcss/no-unnecessary-whitespace': 'warn',

            'better-tailwindcss/no-unregistered-classes': 'off',
            'better-tailwindcss/no-conflicting-classes': 'error',

            ...prettierConfig.rules,
            'prettier/prettier': 'warn',
        },
    },
]
