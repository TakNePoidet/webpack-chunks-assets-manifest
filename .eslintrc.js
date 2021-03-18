module.exports = {
	extends: ['taknepoidet'],
	rules: {
		'react/jsx-filename-extension': [1, { extensions: ['.jsx', '.tsx'] }],
		'import/extensions': [
			'error',
			'always',
			{
				jsx: 'never',
				js: 'never',
				ts: 'never',
				tsx: 'never'
			}
		],
		'import/prefer-default-export': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'no-restricted-syntax': 'off',
		'no-return-await': 'off',
		'@typescript-eslint/return-await': 'off'
	},
	settings: {
		'import/resolver': {
			node: {
				extensions: ['.scss', '.sass', '.ts', '.js', '.tsx', '.jsx']
			},
			webpack: {
				config: './build/prod.webpack.config.js',
				env: {
					NODE_ENV: 'local',
					production: true
				}
			}
		}
	},
	overrides: [
		{
			files: ['*jsx', '*.tsx'],
			rules: {
				'no-use-before-define': 'off'
			}
		}
	],
	globals: {
		JSX: true
	}
};
