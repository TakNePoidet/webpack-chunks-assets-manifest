// eslint-disable-next-line import/no-cycle
import { ChunksAssetsGroups, WebpackChunksAssetsManifestOption } from './types.d';

export const PLUGIN_NAME = 'WebpackChunksAssetsManifest';

export const defaultOptions: WebpackChunksAssetsManifestOption = {
	writeToDisk: 'auto',
	output: 'chunks-assets-manifest.json',
	assetsGroup: {
		js: /\.js/,
		css: /\.css/
	},
	done: null,
	transform: null
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isMap(value: any): boolean {
	return value instanceof Map;
}
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isSet(value: any): boolean {
	return value instanceof Set;
}

function mapToObject<T extends string, K>(map: Map<T, K>) {
	const entries = Array.from<[T, K]>(map);

	return entries.reduce((obj, [key, value]: [T, K]): Record<T, K> => {
		obj[key] = value;
		return obj;
	}, {} as Record<T, K>);
}

export function chunksAssetsGroupsToObject(
	chunksAssetsGroups: Map<string, ChunksAssetsGroups>
): Record<string, any> {
	const entrypoints: Record<string, any> = {};

	if (isMap(chunksAssetsGroups)) {
		const chunks = mapToObject(chunksAssetsGroups);

		for (const key of Object.keys(chunks)) {
			entrypoints[key] = {};
			const groups = mapToObject(chunks[key]);

			for (const group of Object.keys(groups)) {
				entrypoints[key][group] = Array.from(groups[group]);
			}
		}
	}
	return entrypoints;
}
