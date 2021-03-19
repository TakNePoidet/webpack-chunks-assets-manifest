# Webpack Chunks Assets Manifest
This webpack plugin will generate a JSON file that corresponds to the entry points and its resources
## Installation
```bash
yarn add webpack-chunks-assets-manifest -D
```
or
```bash
npm install webpack-chunks-assets-manifest --save-dev
```
## Usage
In your webpack config, require the `plugin` then add an instance to the plugins array.

```javascript
const path = require('path');
const WebpackChunksAssetsManifest = require('webpack-chunks-assets-manifest');

module.exports = {
  entry: {
    index: '.src/index.js'
    // Your entry points
  },
  output: {
    path: path.join( __dirname, 'dist' ),
    filename: '[name]-[hash].js',
    chunkFilename: '[id]-[chunkhash].js',
  },
  module: {
    // Your loader rules go here.
  },
  plugins: [
    new WebpackChunksAssetsManifest({
      // Options go here
    }),
 ],
};
```
### Sample output
```json
{
 "index" : {
    "js": [
    "runtime-46bacc26e330fbf21c0d.js",
    "vendor-d3548574b0b9152ead6d.js",
    "index-9c68d5e8de1b810a80e4.js"
  ],
  "css": ["index-9c68d5e8de1b810a80e4.css"],
},
  "async-chunk" : {
    "js": [
      "async-chunk-9c68d5e8de1b810a80e4.js"
    ]
  }
}
```

## Options ([read the schema](src/options-schema.json))
### `output`
Type: `string`

Default: `chunks-assets-manifest`

This is where to save the manifest file relative to your webpack `output.path`.

### `writeToDisk`

Type: `boolean`, `string`

Default: `'auto'`

Write the manifest to disk using `fs`.

:warning: If you're using another language for your site and you're using `webpack-dev-server` to process your assets during development,
you should set `writeToDisk: true` and provide an absolute path in `output` so the manifest file is actually written to disk and not kept only in memory.

### `done`

Type: `function`

Default: `null`

Callback to run after the compilation is done and the manifest has been written.

### `transform`

Type: `function`

Default: `null`

Callback to transform the entire manifest.


## Hooks
This plugin is using hooks from `Tapable`.

The `transform` and `done` options are automatically tapped into the appropriate hook.

| Name | Type | Callback signature |
| ---- | ---- | --------- |
| `transform` | `SyncWaterfallHook` | `function(chunksAssetsGroups){}` |
| `done` | `AsyncSeriesHook` | `async function(chunksAssetsGroups, stats){}` |


## Changelog
See the whole [Changelog](/docs/CHANGELOG.md)
