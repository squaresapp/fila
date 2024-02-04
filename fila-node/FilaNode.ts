
/** @internal */
declare const NODE: boolean;

(() =>
{
	if (typeof NODE === "undefined")
		Object.assign(globalThis, { NODE: typeof process + typeof require === "objectfunction" });
	
	//@ts-ignore
	if (!NODE) return;
	
	class FilaNode extends Fila
	{
		/** */
		private readonly fs = require("fs") as typeof import("fs");
		
		/** */
		async readText()
		{
			return await this.fs.promises.readFile(this.path, "utf8");
		}
		
		/** */
		async readBinary(): Promise<ArrayBuffer>
		{
			return await this.fs.promises.readFile(this.path);
		}
		
		/** */
		async readDirectory()
		{
			const fileNames = await this.fs.promises.readdir(this.path);
			const filas: Fila[] = [];
			
			for (const fileName of fileNames)
				if (fileName !== ".DS_Store")
					filas.push(new Fila(...this.components, fileName));
			
			return filas;
		}
		
		/** */
		async writeText(text: string, options?: Fila.IWriteTextOptions)
		{
			await this.up().writeDirectory();
			
			if (options?.append)
				await this.fs.promises.appendFile(this.path, text);
			else
				await this.fs.promises.writeFile(this.path, text);
		}
		
		/** */
		async writeBinary(arrayBuffer: ArrayBuffer)
		{
			await this.up().writeDirectory();
			const buffer = Buffer.from(arrayBuffer);
			await this.fs.promises.writeFile(this.path, buffer);
		}
		
		/** */
		async writeDirectory()
		{
			if (!this.fs.existsSync(this.path))
				await this.fs.promises.mkdir(this.path, { recursive: true });
		}
		
		/**
		 * Writes a symlink file at the location represented by the specified
		 * Fila object, to the location specified by the current Fila object.
		 */
		async writeSymlink(at: Fila)
		{
			return new Promise<void>(r =>
			{
				this.fs.symlink(at.path, this.path, () =>
				{
					r();
				});
			});
		}
		
		/**
		 * Deletes the file or directory that this Fila object represents.
		 */
		async delete(): Promise<Error | void>
		{
			if (await this.isDirectory())
			{
				return new Promise<Error | void>(resolve =>
				{
					this.fs.rmdir(this.path, { recursive: true }, error =>
					{
						resolve(error || void 0);
					});
				});
			}
			
			await this.fs.promises.unlink(this.path);
		}
		
		/** */
		move(target: Fila)
		{
			return new Promise<void>(resolve =>
			{
				this.fs.rename(this.path, target.path, () => resolve());
			});
		}
		
		/** */
		copy(target: Fila)
		{
			return new Promise<void>(async resolve =>
			{
				if (await this.isDirectory())
				{
					this.fs.cp(this.path, target.path, { recursive: true, force: true }, () => resolve());
				}
				else
				{
					const dir = target.up();
					
					if (!await dir.exists())
						await new Promise(r => this.fs.mkdir(dir.path, { recursive: true }, r));
					
					this.fs.copyFile(this.path, target.path, () => resolve());
				}
			});
		}
		
		/** */
		protected watchProtected(
			recursive: boolean,
			callbackFn: (event: Fila.Event, fila: Fila, secondaryFila?: Fila) => void)
		{
			const watcher = FilaNode.chokidar.watch(this.path);
			
			watcher.on("ready", () =>
			{
				watcher.on("all", (evName, path) =>
				{
					if (path.endsWith("/.DS_Store"))
						return;
					
					let ev: Fila.Event | undefined;
					
					if (evName === "add")
						ev = Fila.Event.create;
					
					else if (evName === "change")
						ev = Fila.Event.modify;
					
					else if (evName === "unlink")
						ev = Fila.Event.delete;
					
					if (ev)
						callbackFn(ev, new Fila(path));
				});
			});
			
			return () => { watcher.removeAllListeners() };
		}
		
		/** */
		private static get chokidar()
		{
			return this._chokidar || (this._chokidar = require("chokidar"));
		}
		private static _chokidar: typeof import("chokidar");
		
		/** */
		rename(newName: string)
		{
			return this.fs.promises.rename(this.path, this.up().down(newName).path);
		}
		
		/** */
		async exists()
		{
			return new Promise<boolean>(r =>
			{
				this.fs.stat(this.path, error =>
				{
					r(!error);
				});
			});
		}
		
		/** */
		async getSize()
		{
			const stats = await this.getStats();
			return stats?.size || 0;
		}
		
		/** */
		async getModifiedTicks()
		{
			const stats = await this.getStats();
			return stats?.mtimeMs || 0;
		}
		
		/** */
		async getCreatedTicks()
		{
			const stats = await this.getStats();
			return stats?.birthtimeMs || 0;
		}
		
		/** */
		async getAccessedTicks()
		{
			const stats = await this.getStats();
			return stats?.atimeMs || 0;
		}
		
		/** */
		async isDirectory()
		{
			const stats = await this.getStats();
			return stats?.isDirectory() || false;
		}
		
		/** */
		private async getStats()
		{
			return new Promise<import("fs").Stats | undefined>(r =>
			{
				this.fs.stat(this.path, (error, stats) =>
				{
					r(stats);
				});
			});
		}
	}
	
	const sep = (require("path") as typeof import("path")).sep;
	const cwd = process.cwd();
	const tmp = (require("os") as typeof import("os")).tmpdir();
	Fila.setup(FilaNode, sep, cwd, tmp);
})();
