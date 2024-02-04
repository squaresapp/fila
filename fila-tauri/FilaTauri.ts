
/** @internal */
declare const TAURI: boolean;

(() =>
{
	if (typeof TAURI === "undefined")
		Object.assign(globalThis, { TAURI: typeof window !== "undefined" && typeof (globalThis as any).__TAURI__ !== "undefined" });
	
	//@ts-ignore
	if (!TAURI) return;
	
	class FilaTauri extends Fila
	{
		/** */
		private readonly fs: typeof import("@tauri-apps/api").fs = 
			(globalThis as any).__TAURI__.fs;
		
		/** */
		readText()
		{
			return this.fs.readTextFile(this.path);
		}
		
		/** */
		readBinary()
		{
			return this.fs.readBinaryFile(this.path);
		}
		
		/** */
		async readDirectory()
		{
			const fileNames = await this.fs.readDir(this.path);
			const filas: Fila[] = [];
			
			for (const fileName of fileNames)
				if (fileName.name !== ".DS_Store")
					filas.push(new Fila(this.path, fileName.name || ""));
			
			return filas;
		}
		
		/** */
		async writeText(text: string, options?: Fila.IWriteTextOptions)
		{
			try
			{
				const up = this.up();
				if (!await up.exists())
					await up.writeDirectory();
				
				await this.fs.writeTextFile(this.path, text, {
					append: options?.append
				});
			}
			catch (e)
			{
				debugger;
			}
		}
		
		/** */
		async writeBinary(arrayBuffer: ArrayBuffer)
		{
			await this.up().writeDirectory();
			await this.fs.writeBinaryFile(this.path, arrayBuffer);
		}
		
		/** */
		async writeDirectory()
		{
			this.fs.createDir(this.path, { recursive: true });
		}
		
		/**
		 * Writes a symlink file at the location represented by the specified
		 * Fila object, to the location specified by the current Fila object.
		 */
		async writeSymlink(at: Fila)
		{
			return null as any;
		}
		
		/**
		 * Deletes the file or directory that this Fila object represents.
		 */
		async delete(): Promise<Error | void>
		{
			if (await this.isDirectory())
			{
				return new Promise<Error | void>(async resolve =>
				{
					await this.fs.removeDir(this.path, { recursive: true });
					resolve();
				});
			}
			
			await this.fs.removeFile(this.path);
		}
		
		/** */
		move(target: Fila)
		{
			return null as any;
		}
		
		/** */
		async copy(target: Fila)
		{
			if (await target.isDirectory())
				throw "Copying directories is not implemented.";
			
			await this.fs.copyFile(this.path, target.path);
		}
		
		/** */
		protected watchProtected(
			recursive: boolean,
			callbackFn: (event: Fila.Event, fila: Fila) => void)
		{
			let un: Function | null = null;
			
			(async () =>
			{
				un = await watchInternal(this.path, {}, async ev =>
				{
					if (!un)
						return;
					
					const payload = ev.payload.payload;
					if (typeof payload !== "string")
						return;
					
					const fila = new Fila(ev.payload.payload);
					
					if (ev.type === "NoticeWrite" || ev.type === "Write")
						callbackFn(Fila.Event.modify, fila);
					
					else if (ev.type === "NoticeRemove" || ev.type === "Remove")
						callbackFn(Fila.Event.delete, fila);
					
					else if (ev.type === "Create" || ev.type === "Rename")
						callbackFn(Fila.Event.modify, fila);
				});
			})();
			
			return () =>
			{
				// This is hacky... the interface expects a function to be
				// returned rather than a promise that resolves to one,
				// so this waits 100ms to call the un() function if this unwatch
				// function is invoked immediately after calling watch().
				if (un)
					un();
				else
					setTimeout(() => un?.(), 100);
			};
		}
		
		/** */
		async rename(newName: string)
		{
			// Note that the "renameFile" method actually works on directories
			return this.fs.renameFile(this.path, this.up().down(newName).path);
		}
		
		/** */
		async exists()
		{
			return this.fs.exists(this.path);
		}
		
		/** */
		async getSize()
		{
			return (await this.getMeta()).size;
		}
		
		/** */
		async getModifiedTicks()
		{
			return (await this.getMeta()).modifiedAt;
		}
		
		/** */
		async getCreatedTicks()
		{
			return (await this.getMeta()).createdAt;
		}
		
		/** */
		async getAccessedTicks()
		{
			return (await this.getMeta()).accessedAt;
		}
		
		/** */
		async isDirectory()
		{
			return (await this.getMeta()).isDir;
		}
		
		/** */
		private async getMeta()
		{
			return this._meta || (this._meta = await getMetadata(this.path));
		}
		private _meta: Metadata | null = null;
	}
	
	const setup = Fila.setup; Fila.setup = async () =>
	{
		let path: typeof import("@tauri-apps/api").path | null = null;
			
		try
		{
			path = (globalThis as any).__TAURI__.path as typeof import("@tauri-apps/api").path;
		}
		catch (e)
		{
			console.log("withGlobalTauri is not set");
			return;
		}
		
		let cwd = "/";
		let tmp = "/";
		
		try
		{
			cwd = await path.appDataDir();
			tmp = await path.appCacheDir();
		}
		catch (e)
		{
			console.error("The Tauri environment doesn't have access to the path APIs");
		}
		
		setup(FilaTauri, path?.sep || "", cwd, tmp);
	};
	
	const t = (globalThis as any).__TAURI__;
	const tauri: typeof import("@tauri-apps/api").tauri = t.tauri;
	const wind: typeof import("@tauri-apps/api").window = t.window;

	/** @internal */
	async function unwatch(id: any)
	{
		await tauri.invoke('plugin:fs-watch|unwatch', { id });
	}

	/** @internal */
	async function watchInternal(
		paths: string | string[],
		options: DebouncedWatchOptions,
		callbackFn: (event: TauriWatchEvent) => void): Promise<() => Promise<void>>
	{
		const opts = {
			recursive: false,
			delayMs: 2000,
			...options,
		};
		
		let watchPaths;
		if (typeof paths === "string")
			watchPaths = [paths];
		else
			watchPaths = paths;
		
		const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
		await tauri.invoke("plugin:fs-watch|watch", {
			id,
			paths: watchPaths,
			options: opts,
		});
		
		const unlisten = await wind.appWindow.listen(
			`watcher://raw-event/${id}`,
			event =>
		{
			callbackFn(event as TauriWatchEvent);
		});
		
		return async () =>
		{
			await unwatch(id);
			unlisten();
		};
	}

	/** @internal */
	async function watchImmediate(
		paths: string | string[],
		options: DebouncedWatchOptions,
		callbackFn: (event: TauriWatchEvent) => void): Promise<() => Promise<void>>
	{
		const opts = {
			recursive: false,
			...options,
			delayMs: null
		};
		
		const watchPaths = typeof paths === "string" ? [paths] : paths;
		const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
		
		await tauri.invoke("plugin:fs-watch|watch", {
			id,
			paths: watchPaths,
			options: opts,
		});
		
		const unlisten = await wind.appWindow.listen(
			`watcher://raw-event/${id}`,
			event =>
		{
			callbackFn(event as TauriWatchEvent);
		});
		
		return async () =>
		{
			await unwatch(id);
			unlisten();
		};
	}

	/** */
	interface TauriWatchEvent
	{
		/** Example: "watcher://debounced-event/2903032" */
		readonly event: string;
		/** Example: "main" */
		readonly windowLabel: string;
		/** Example: /Users/user/Library/Application Support/com.app/filename.txt */
		readonly payload: { payload: string; };
		/** */
		readonly type: 
			"NoticeWrite" |
			"NoticeRemove" |
			"Create" |
			"Write" |
			"Chmod" |
			"Remove" |
			"Rename" |
			"Rescan" |
			"Error";
		
		/** */
		readonly id: number;
	}

	/** @internal */
	interface WatchOptions
	{
		recursive?: boolean;
	}

	/** @internal */
	interface DebouncedWatchOptions extends WatchOptions
	{
		delayMs?: number;
	}

	/** @internal */
	function getMetadata(path: string): Promise<Metadata>
	{
		return tauri.invoke("plugin:fs-extra|metadata", { path });
	}

	/**
	 * Metadata information about a file.
	 * This structure is returned from the `metadata` function or method
	 * and represents known metadata about a file such as its permissions,
	 * size, modification times, etc.
	 */
	interface Metadata
	{
		/**
		 * The last access time of this metadata.
		 */
		readonly accessedAt: number;
		
		/**
		 * The creation time listed in this metadata.
		 */
		readonly createdAt: number;
		
		/**
		 * The last modification time listed in this metadata.
		 */
		readonly modifiedAt: number;
		
		/**
		 * `true` if this metadata is for a directory.
		 */
		readonly isDir: boolean;
		
		/**
		 * `true` if this metadata is for a regular file.
		 */
		readonly isFile: boolean;
		
		/**
		 * `true` if this metadata is for a symbolic link.
		 */
		readonly isSymlink: boolean;
		
		/**
		 * The size of the file, in bytes, this metadata is for.
		 */
		readonly size: number;
		
		/**
		 * The permissions of the file this metadata is for.
		 */
		readonly permissions: Permissions;
		
		/**
		 * The ID of the device containing the file. Only available on Unix.
		 */
		readonly dev?: number;
		
		/**
		 * The inode number. Only available on Unix.
		 */
		readonly ino?: number;
		
		/**
		 * The rights applied to this file. Only available on Unix.
		 */
		readonly mode?: number;
		
		/**
		 * The number of hard links pointing to this file. Only available on Unix.
		 */
		readonly nlink?: number;
		
		/**
		 * The user ID of the owner of this file. Only available on Unix.
		 */
		readonly uid?: number;
		
		/**
		 * The group ID of the owner of this file. Only available on Unix.
		 */
		readonly gid?: number;
		
		/**
		 * The device ID of this file (if it is a special one). Only available on Unix.
		 */
		readonly rdev?: number;
		
		/**
		 * The block size for filesystem I/O. Only available on Unix.
		 */
		readonly blksize?: number;
		
		/**
		 * The number of blocks allocated to the file, in 512-byte units. Only available on Unix.
		 */
		readonly blocks?: number;
	}

	/** */
	interface Permissions
	{
		/**
		 * `true` if these permissions describe a readonly (unwritable) file.
		 */
		readonly: boolean;
		
		/**
		 * The underlying raw `st_mode` bits that contain the standard Unix
		 * permissions for this file.
		 */
		mode?: number;
	}
})();