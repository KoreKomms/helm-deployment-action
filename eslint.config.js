import { defineConfig, globalIgnores } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';
import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = import.meta.dirname;

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const config = defineConfig([
  {
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname
      },

      globals: {
        ...globals.node,
        ...globals.jest
      }
    },

    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin
    },

    extends: compat.extends('plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'),

    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  globalIgnores(['**/.eslintrc.js', 'dist/**'])
]);

export default config;
