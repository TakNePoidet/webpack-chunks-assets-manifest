const plugins = [];
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const sourceMaps = require('rollup-plugin-sourcemaps');
const typescript = require('@rollup/plugin-typescript');
const { terser } = require('rollup-plugin-terser');
const externals = require('rollup-plugin-node-externals');
const json = require('@rollup/plugin-json');

if (!isDev) {
	plugins.push(
		terser({
			compress: {
				inline: true,
				passes: 1,
				keep_fargs: false,
				drop_console: true
			},
			output: {
				beautify: false,
				comments: false
			},
			mangle: true
		})
	);
} else {
	plugins.push(sourceMaps());
}
module.exports = {
	input: './src/index.ts',
	output: [
		{
			file: './dist/index.js',
			exports: 'auto',
			format: 'cjs',
			sourcemap: isDev,
			externalLiveBindings: true
		}
	],
	watch: {
		exclude: ['node_modules/**', 'test/**']
	},
	plugins: [
		json(),
		externals({
			deps: true
		}),
		commonjs(),
		nodeResolve(),
		typescript({
			sourceMap: isDev,
			tsconfig: './tsconfig.json'
		}),
		...plugins
	]
};
