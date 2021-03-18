export type AssetsChunk = Set<string>;
export type ChunksAssetsGroups = Map<string, AssetsChunk>;
export interface WebpackChunksAssetsManifestOption {
	output: string;
	writeToDisk: 'auto' | boolean;
	assetsGroup: {
		[key: string]: RegExp | RegExp[];
	};
	done: null | ((...args: any[]) => any);
	transform: null | ((...args: any[]) => any);
}
