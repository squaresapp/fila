# Fila

File system layer with multiple backends.

## Installation

The first step is to install Fila through npm, or by pulling one of the scripts directly from cdnjs (look in the npm package, there are specific compilations for each backend, as well as one that includes all the backends and uses the one that is relevant to the current environment).

```
npm install @squaresapp/fila
```

Once that is done, there are some additional steps that need to happen to support each environment. Fila purposely omits some dependencies that you'll need to install yourself, in order to keep the dependencies low and the multi-environment potential high.

## Capacitor

The Capacitor backend is a wrapper over the `@capacitor/filesystem` module, so no further dependencies are needed.

## Node.JS

The Node.JS backend mostly works out of the box, but if you want to use the `fila.watch()` method, this depends on `chokaidar`. If you want to use file watching on Node.js, you'll need to:

```
npm install chokidar
```

## Tauri (1.5)

The Tauri backend meta data methods depend on plugin `fs-extra` and `fs-watch`.You can install these plugins here:

[https://github.com/tauri-apps/tauri-plugin-fs-extra](https://github.com/tauri-apps/tauri-plugin-fs-extra)

[https://github.com/tauri-apps/tauri-plugin-fs-watch](https://github.com/tauri-apps/tauri-plugin-fs-watch)

You'll also need to configure your `allowlist` in your `tauri.conf.json` file. Here is a segment of a sample to `tauri.conf.json` file to just allow everything in order to get something working (not terribly secure):

```json
{
	"tauri": {
		"allowlist": {
			"fs": {
				"scope": ["*/**"]
			},
			"path": {
				"all": true
			},
		}
	}
}
```

See [this Tauri issue](https://github.com/tauri-apps/tauri/issues/4130) for more information on how to configure your allow list.

Note that these instructions are for Tauri 1.5. Tauri 2.0 uses a completely different system and will likely need a separate Fila backend in order to operate over it's file system plugin system.

## Web

The Web backend uses the [Keyva](https://github.com/paul-go/Keyva) IndexedDB layer. Make sure Keyva is visible globally, or install Keyva with npm via:

```
npm install keyvajs
```
