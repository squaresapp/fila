
declare const WEB: boolean;

(() =>
{
	if (typeof WEB === "undefined")
		Object.assign(globalThis, { WEB: !NODE && !CAPACITOR && !TAURI && typeof indexedDB === "object" })
	
	//@ts-ignore
	if (!WEB) return;
	
	type Keyva = typeof import("keyvajs");
	
	class FilaWeb extends Fila
	{
		/** @internal */
		private static keyva: Keyva;
		
		/** */
		constructor(...components: string[])
		{
			super(...components);
			FilaWeb.keyva ||= new Keyva({ name: "fila" });
		}
		
		/** */
		async readText()
		{
			return await FilaWeb.keyva.get<string>(this.path);
		}
		
		/** */
		async readBinary(): Promise<ArrayBuffer>
		{
			const value = await FilaWeb.keyva.get(this.path);
			return value instanceof ArrayBuffer ?
				value :
				new TextEncoder().encode(value);
		}
		
		/** */
		async readDirectory()
		{
			const filas: Fila[] = [];
			const range = Keyva.prefix(this.path + "/");
			const contents = await FilaWeb.keyva.each({ range }, "keys");
			
			for (const key of contents)
				if (typeof key === "string")
					filas.push(new Fila(key));
			
			return filas;
		}
		
		/** */
		async writeText(text: string, options?: Fila.IWriteTextOptions)
		{
			let current = this.up();
			const missingFolders: Fila[] = [];
			
			for (;;)
			{
				if (await current.exists())
					break;
				
				missingFolders.push(current);
				
				if (current.up().path === current.path)
					break;
				
				current = current.up();
			}
			
			for (const folder of missingFolders)
				await folder.writeDirectory();
			
			if (options?.append)
				text = ("" + (await FilaWeb.keyva.get(this.path) || "")) + text;
			
			await FilaWeb.keyva.set(this.path, text);
		}
		
		/** */
		async writeBinary(arrayBuffer: ArrayBuffer)
		{
			await FilaWeb.keyva.set(this.path, arrayBuffer);
		}
		
		/** */
		async writeDirectory()
		{
			if (await this.isDirectory())
				return;
			
			if (await this.exists())
				throw new Error("A file already exists at this location.");
			
			await FilaWeb.keyva.set(this.path, null);
		}
		
		/**
		 * Writes a symlink file at the location represented by the specified
		 * Fila object, to the location specified by the current Fila object.
		 */
		async writeSymlink(at: Fila)
		{
			throw new Error("Not implemented");
		}
		
		/**
		 * Deletes the file or directory that this Fila object represents.
		 */
		async delete(): Promise<Error | void>
		{
			if (await this.isDirectory())
			{
				const range = Keyva.prefix(this.path + "/");
				await FilaWeb.keyva.delete(range);
			}
			
			await FilaWeb.keyva.delete(this.path);
		}
		
		/** */
		async move(target: Fila)
		{
			throw new Error("Not implemented.");
		}
		
		/** */
		async copy(target: Fila)
		{
			throw new Error("Not implemented.");
		}
		
		/** */
		protected watchProtected(
			recursive: boolean,
			callbackFn: (event: Fila.Event, fila: Fila, secondaryFila?: Fila) => void)
		{
			throw new Error("Not implemented");
			return () => {};
		}
		
		/** */
		async rename(newName: string)
		{
			throw new Error("Not implemented.");
		}
		
		/** */
		async exists()
		{
			const value = await FilaWeb.keyva.get(this.path);
			return value !== undefined;
		}
		
		/** */
		async getSize()
		{
			return 0;
		}
		
		/** */
		async getModifiedTicks()
		{
			return 0;
		}
		
		/** */
		async getCreatedTicks()
		{
			return 0;
		}
		
		/** */
		async getAccessedTicks()
		{
			return 0;
		}
		
		/** */
		async isDirectory()
		{
			return await FilaWeb.keyva.get(this.path) === null;
		}
	}
	
	Fila.setup.bind(Fila, FilaWeb, "/", "/", "/__temp/");
})();