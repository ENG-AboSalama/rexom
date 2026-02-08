import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            // Possible Errors
            'no-console': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            
            // Best Practices
            'eqeqeq': ['error', 'always'],
            'no-return-await': 'error',
            'require-await': 'warn',
            
            // Stylistic Issues
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'indent': ['error', 4, { SwitchCase: 1 }],
            'comma-dangle': ['error', 'always-multiline'],
            'no-trailing-spaces': 'error',
            'no-multiple-empty-lines': ['error', { max: 2 }],
            
            // ES6
            'prefer-const': 'error',
            'no-var': 'error',
            'arrow-spacing': 'error',
        },
    },
    {
        ignores: [
            'node_modules/',
            'data/',
            'logs/',
            'dist/',
        ],
    },
];
