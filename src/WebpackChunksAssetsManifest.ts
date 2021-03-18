/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
	WebpackPluginInstance,
	sources,
	Compilation,
	Compiler,
	Chunk
	// eslint-disable-next-line import/no-extraneous-dependencies
} from 'webpack';
import { validate } from 'schema-utils';
import { SyncHook, SyncWaterfallHook, AsyncSeriesHook } from 'tapable';
import path from 'path';
import fs from 'fs';
import optionsSchema from './options-schema.json';
import { chunksAssetsGroupsToObject, defaultOptions, PLUGIN_NAME } from './util';
import { ChunksAssetsGroups, WebpackChunksAssetsManifestOption } from './types.d';

export default class WebpackChunksAssetsManifest implements WebpackPluginInstance {
	private compiler: Compiler;

	private options: WebpackChunksAssetsManifestOption;

	private hooks: Readonly<Record<string, any>>;

	private chunksAssetsGroups: Map<string, ChunksAssetsGroups>;

	constructor(options: Partial<WebpackChunksAssetsManifestOption>) {
		this.hooks = Object.freeze({
			// @ts-ignore
			done: new AsyncSeriesHook(['chunksAssetsGroups', 'stats']),

			transform: new SyncWaterfallHook(['chunksAssetsGroups']),
			options: new SyncWaterfallHook(['options']),
			afterOptions: new SyncHook(['options'])
		});

		this.hooks.transform.tap(PLUGIN_NAME, (assets) => assets);

		this.hooks.afterOptions.tap(
			PLUGIN_NAME,
			(_options: Partial<WebpackChunksAssetsManifestOption>) => {
				this.options = { ...defaultOptions, ..._options };
				validate(optionsSchema as any, this.options, { name: PLUGIN_NAME });
				this.options.output = path.normalize(this.options.output);
				['done', 'transform'].forEach((hookName) => {
					if (hookName && typeof this.options[hookName] === 'function') {
						this.hooks[hookName].tap(`${PLUGIN_NAME}.option.${hookName}`, this.options[hookName]);
					}
				});
			}
		);
		this.options = { ...defaultOptions, ...options };
	}

	apply(compiler: Compiler): void {
		this.compiler = compiler;
		this.options = this.hooks.options.call(this.options);
		this.hooks.afterOptions.call(this.options);

		compiler.hooks.watchRun.tap(PLUGIN_NAME, this.handleWatchRun.bind(this));
		compiler.hooks.afterEmit.tapPromise(PLUGIN_NAME, this.handleAfterEmit.bind(this));

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, this.handleThisCompilation.bind(this));

		compiler.hooks.done.tapPromise(
			PLUGIN_NAME,
			async (stats) => await this.hooks.done.promise(this.chunksAssetsGroups, stats)
		);
	}

	private handleThisCompilation(compilation: Compilation) {
		compilation.hooks.afterProcessAssets.tap(
			PLUGIN_NAME,
			this.handleAfterProcessAssets.bind(this, compilation)
		);
	}

	private handleWatchRun() {
		if (this.chunksAssetsGroups) {
			this.chunksAssetsGroups.clear();
		}
	}

	private async handleAfterProcessAssets(compilation: Compilation) {
		const entrypoints = new Map<string, ChunksAssetsGroups>();
		const groupChunkName = new Map<string, Set<string | number>>();

		const {
			assetsByChunkName,
			namedChunkGroups,
			chunks: assetChunks
		} = compilation.getStats().toJson();

		for (const chunkName of Object.keys(assetsByChunkName)) {
			if (!groupChunkName.has(chunkName)) {
				groupChunkName.set(chunkName, new Set());
			}
			const chunks = assetChunks.filter(({ names }) => names.includes(chunkName));

			if (chunks.length > 0) {
				const chunk = chunks[0];

				if (chunk.modules.length > 0) {
					chunk.modules.forEach((module) => {
						module.assets.forEach((asset) => {
							groupChunkName.get(chunkName).add(asset);
						});
					});
				}
			}
		}
		for (const key of Object.keys(namedChunkGroups)) {
			if (Object.prototype.hasOwnProperty.call(namedChunkGroups, key)) {
				const { assets } = namedChunkGroups[key];
				const { assetsGroup } = this.options;

				if (!entrypoints.has(key)) {
					entrypoints.set(key, new Map());
				}

				for (const assetGroupKey of Object.keys(assetsGroup)) {
					const patterns: RegExp[] = [];

					if (!entrypoints.get(key).has(assetGroupKey)) {
						entrypoints.get(key).set(assetGroupKey, new Set());
					}

					if (!Array.isArray(assetsGroup[assetGroupKey])) {
						patterns.push(assetsGroup[assetGroupKey] as RegExp);
					} else {
						patterns.push(...(assetsGroup[assetGroupKey] as RegExp[]));
					}

					for (const asset of assets) {
						if (WebpackChunksAssetsManifest.checkPatterns(asset.name, patterns)) {
							entrypoints.get(key).get(assetGroupKey).add(asset.name);
						}
					}
				}
			}
		}
		this.chunksAssetsGroups = entrypoints;

		this.emitAssetsManifest(compilation);
	}

	private emitAssetsManifest(compilation: Compilation) {
		const output = this.getManifestPath(
			compilation,
			this.inDevServer
				? path.basename(this.options.output)
				: path.relative(compilation.compiler.outputPath, this.getOutputPath())
		);

		compilation.emitAsset(output, new sources.RawSource(this.toString(), false), {
			assetsManifest: true
		});
	}

	private shouldWriteToDisk(compilation): boolean {
		if (this.options.writeToDisk === 'auto') {
			return (
				this.inDevServer &&
				path
					.relative(
						this.compiler.outputPath,
						this.getManifestPath(compilation, this.getOutputPath())
					)
					.startsWith('..')
			);
		}
		return this.options.writeToDisk;
	}

	private async handleAfterEmit(compilation) {
		if (this.shouldWriteToDisk(compilation)) {
			await this.writeTo(this.getManifestPath(compilation, this.getOutputPath()));
		}
	}

	private toJSON(): string {
		return this.hooks.transform.call(chunksAssetsGroupsToObject(this.chunksAssetsGroups));
	}

	private toString() {
		return JSON.stringify(this, null, 2) || '{}';
	}

	private async writeTo(destination: string): Promise<void> {
		await fs.promises.mkdir(path.dirname(destination), { recursive: true });
		// @ts-ignore
		await fs.promises.writeFile(destination, this.toString());
	}

	private getOutputPath() {
		if (path.isAbsolute(this.options.output)) {
			return this.options.output;
		}

		if (!this.compiler) {
			return '';
		}

		if (this.inDevServer) {
			let outputPath =
				this.compiler.options.devServer.outputPath || this.compiler.outputPath || '/';

			if (outputPath === '/') {
				console.warn(
					'Please use an absolute path in options.output when using webpack-dev-server.'
				);
				outputPath = this.compiler.context || process.cwd();
			}
			return path.resolve(outputPath, this.options.output);
		}
		return path.resolve(this.compiler.outputPath, this.options.output);
	}

	private getManifestPath(compilation: Compilation, filename: string) {
		return compilation.getPath(filename, {
			chunk: { name: 'chunks-assets-manifest' } as Chunk,
			filename: 'chunks-assets-manifest.json'
		});
	}

	private get inDevServer(): boolean {
		return !!process.env.WEBPACK_DEV_SERVER;
	}

	private static checkPatterns(string, patterns: RegExp[]): boolean {
		return patterns.reduce(
			(check: boolean, pattern: RegExp) => check || !!pattern.exec(string),
			false
		);
	}
}
