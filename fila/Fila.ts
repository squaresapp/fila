
class Fila
{
	/**
	 * @internal
	 * Abstract class that must be implemented by Fila backends.
	 */
	static readonly FilaBackend = (() =>
	{
		abstract class FilaBackend
		{
			constructor(protected readonly fila: Fila) { }
			
			abstract readText(): Promise<string>;
			abstract readBinary(): Promise<ArrayBuffer>;
			abstract readDirectory(): Promise<Fila[]>;
			abstract writeText(text: string, options?: Fila.IWriteTextOptions): Promise<void>;
			abstract writeBinary(buffer: ArrayBuffer): Promise<void>;
			abstract writeDirectory(): Promise<void>;
			abstract writeSymlink(at: Fila): Promise<void>;
			abstract delete(): Promise<Error | void>;
			abstract move(target: Fila): Promise<void>;
			abstract copy(target: Fila): Promise<void>;
			
			abstract watchProtected(
				recursive: boolean, 
				callbackFn: (event: Fila.Event, fila: Fila) => void): () => void;
			
			abstract rename(newName: string): Promise<void>;
			abstract exists(): Promise<boolean>;
			abstract getSize(): Promise<number>;
			abstract getModifiedTicks(): Promise<number>;
			abstract getCreatedTicks(): Promise<number>;
			abstract getAccessedTicks(): Promise<number>;
			abstract isDirectory(): Promise<boolean>;
		}
		
		return FilaBackend;
	})();
	
	/**
	 * @internal
	 * Each backend calls this method to perform the setup functions.
	 * This is the internal .setup() overload that is called by each implementor.
	 */
	static setup(backend: typeof Fila.FilaBackend, sep: string, cwd: string, temp: string)
	{
		this.backend = backend;
		this._sep = sep || "/";
		this._cwd = cwd!;
		this._temporary = temp!;
	}
	
	private static backend: typeof Fila.FilaBackend;
	
	/**
	 * Path separator.
	 */
	static get sep()
	{
		return this._sep as "\\" | "/";
	}
	private static _sep: string = "/";
	
	/**
	 * Gets the current working directory of the process.
	 */
	static get cwd()
	{
		if (typeof this._cwd === "string")
			return this._cwd = new Fila(this._cwd);
		
		return this._cwd;
	}
	private static _cwd: Fila | string = "";
	
	/**
	 * 
	 */
	static get temporary()
	{
		if (typeof this._temporary === "string")
			return this._temporary = new Fila(this._temporary);
		
		return this._temporary;
	}
	private static _temporary: Fila | string = "";
	
	/**
	 * Returns a Fila instance from the specified path in the case when
	 * a string is provided, or returns the Fila instance as-is when a Fila
	 * object is provided.
	 */
	static from(via: string | Fila)
	{
		return typeof via === "string" ? new Fila(via) : via;
	}
	
	/** */
	constructor(...components: string[])
	{
		components = components.filter(s => !!s);
		
		if (components.join("") !== "/")
		{
			if (components.length === 0 || components[0].startsWith("."))
				components.unshift(Fila.cwd.path);
			
			for (let i = components.length; i-- > 0;)
				components.splice(i, 1, ...components[i].split(Fila.sep));
			
			components = components.filter(s => !!s);
			components = Fila.normalize(components.join(Fila.sep)).split(Fila.sep);
		}
		
		this.components = components;
		let back: InstanceType<typeof Fila.FilaBackend>;
		//@ts-ignore
		back = new Fila.backend(this);
		this.back = back;
	}
	
	readonly components;
	private readonly back: InstanceType<typeof Fila.FilaBackend>;
	
	/** */
	readText(): Promise<string> { return this.back.readText(); }
	
	/** */
	readBinary(): Promise<ArrayBuffer> { return this.back.readBinary(); }
	
	/** */
	readDirectory(): Promise<Fila[]> { return this.back.readDirectory(); }
	
	/** */
	writeText(text: string, options?: Fila.IWriteTextOptions): Promise<void>
	{
		return this.back.writeText(text, options);
	}
	
	/** */
	writeBinary(buffer: ArrayBuffer): Promise<void> { return this.back.writeBinary(buffer); }
	
	/** */
	writeDirectory(): Promise<void> { return this.back.writeDirectory(); }
	
	/**
	 * Writes a symlink file at the location represented by the specified
	 * Fila object, to the location specified by the current Fila object.
	 */
	writeSymlink(at: Fila): Promise<void> { return this.back.writeSymlink(at); }
	
	/**
	 * Deletes the file or directory that this Fila object represents.
	 */
	delete(): Promise<Error | void> { return this.back.delete(); }
	
	/** */
	move(target: Fila): Promise<void> { return this.back.move(target); }
	
	/**
	 * Copies the file to the specified location, and creates any
	 * necessary directories along the way.
	 */
	copy(target: Fila): Promise<void> { return this.back.copy(target); }
	
	/**
	 * Recursively watches this folder, and all nested files contained
	 * within all subfolders. Returns a function that terminates
	 * the watch service when called.
	 */
	watch(
		recursive: "recursive",
		callbackFn: (event: Fila.Event, fila: Fila) => void): () => void;
	/**
	 * Watches for changes to the specified file or folder. Returns
	 * a function that terminates the watch service when called.
	 */
	watch(
		callbackFn: (event: Fila.Event, fila: Fila) => void): () => void;
	/** */
	watch(a: any, b?: (event: Fila.Event, fila: Fila) => void)
	{
		const recursive = a === "recursive";
		const callbackFn = b || a;
		return this.watchProtected(recursive, callbackFn);
	}
	
	/** */
	protected watchProtected(
		recursive: boolean, 
		callbackFn: (event: Fila.Event, fila: Fila) => void): () => void
	{
		return this.back.watchProtected(recursive, callbackFn);
	}
	
	/** */
	rename(newName: string): Promise<void> { return this.back.rename(newName); }
	
	/** */
	exists(): Promise<boolean> { return this.back.exists(); }
	
	/** */
	getSize(): Promise<number> { return this.back.getSize(); }
	
	/** */
	getModifiedTicks(): Promise<number> { return this.back.getModifiedTicks(); }
	
	/** */
	getCreatedTicks(): Promise<number> { return this.back.getCreatedTicks(); }
	
	/** */
	getAccessedTicks(): Promise<number> { return this.back.getAccessedTicks(); }
	
	/** */
	isDirectory(): Promise<boolean> { return this.back.isDirectory(); }
	
	/**
	 * In the case when this Fila object represents a file, this method returns a 
	 * Fila object that represents the directory that contains said file.
	 * 
	 * In the case when this Fila object represents a directory, this method
	 * returns the current Fila object as-is.
	 */
	async getDirectory(): Promise<Fila>
	{
		if (await this.isDirectory())
			return this;
		
		return new Fila(...this.up().components);
	}
	
	/**
	 * Gets the file or directory name of the file system object being
	 * represented by this Fila object.
	 */
	get name()
	{
		return this.components.at(-1) || "";
	}
	
	/**
	 * Get the file extension of the file being represented by this
	 * Fila object, with the "." character.
	 */
	get extension()
	{
		const name = this.name;
		const lastDot = name.lastIndexOf(".");
		return lastDot < 0 ? "" : name.slice(lastDot);
	}
	
	/**
	 * Gets the fully-qualified path, including any file name to the
	 * file system object being represented by this Fila object.
	 */
	get path()
	{
		return Fila.sep + Fila.join(...this.components);
	}
	
	/**
	 * Returns a Fila object that represents the first or nth containing
	 * directory of the object that this Fila object represents.
	 * Returns the this reference in the case when the 
	 */
	up(count = 1)
	{
		if (this.components.length < 2)
			return this;
		
		const parentComponents = this.components.slice(0, -count);
		return parentComponents.length > 0 ?
			new Fila(...parentComponents) :
			new Fila("/");
	}
	
	/**
	 * Searches upward through the file system ancestry for a nested file.
	 */
	async upscan(relativeFileName: string)
	{
		let ancestry = this as Fila;
		
		do
		{
			const maybe = ancestry.down(relativeFileName);
			if (await maybe.exists())
				return maybe;
			
			if (ancestry.components.length === 1)
				break;
			
			ancestry = ancestry.up();
		}
		while (ancestry.components.length > 0);
		
		return null as any as Fila | null;
	}
	
	/**
	 * Returns a Fila object that represents a file or directory nested
	 * within the current Fila object (which must be a directory).
	 */
	down(...additionalComponents: string[])
	{
		return new Fila(...this.components, ...additionalComponents);
	}
}

namespace Fila
{
	/** */
	export interface IWriteTextOptions
	{
		readonly append: boolean;
	}
	
	/** */
	export function join(...args: string[])
	{
		if (args.length === 0)
			return ".";
		
		let joined: string | undefined;
		
		for (let i = 0; i < args.length; ++i)
		{
			let arg = args[i];
			
			if (arg.length > 0)
			{
				if (joined === undefined)
					joined = arg;
				else
					joined += "/" + arg;
			}
		}
		
		if (joined === undefined)
			return ".";
		
		return normalize(joined);
	}
	
	/** */
	export function normalize(path: string)
	{
		if (path.length === 0)
			return ".";
		
		const isAbsolute = path.charCodeAt(0) === Char.slash;
		const trailingSeparator = path.charCodeAt(path.length - 1) === Char.slash;
		
		// Normalize the path
		path = normalizeStringPosix(path, !isAbsolute);
		
		if (path.length === 0 && !isAbsolute)
			path = ".";
		
		if (path.length > 0 && trailingSeparator)
			path += Fila.sep;
		
		if (isAbsolute)
			return Fila.sep + path;
		
		return path;
	}
	
	/** */
	function normalizeStringPosix(path: string, allowAboveRoot: boolean)
	{
		let res = "";
		let lastSegmentLength = 0;
		let lastSlash = -1;
		let dots = 0;
		let code;
		
		for (let i = 0; i <= path.length; ++i)
		{
			if (i < path.length)
				code = path.charCodeAt(i);
			
			else if (code === Char.slash)
				break;
			
			else
				code = Char.slash;
			
			if (code === Char.slash)
			{
				if (lastSlash === i - 1 || dots === 1)
				{
					// NOOP
				}
				else if (lastSlash !== i - 1 && dots === 2)
				{
					if (res.length < 2 || 
						lastSegmentLength !== 2 || 
						res.charCodeAt(res.length - 1) !== Char.dot ||
						res.charCodeAt(res.length - 2) !== Char.dot)
					{
						if (res.length > 2)
						{
							let lastSlashIndex = res.lastIndexOf(Fila.sep);
							if (lastSlashIndex !== res.length - 1)
							{
								if (lastSlashIndex === -1)
								{
									res = "";
									lastSegmentLength = 0;
								}
								else
								{
									res = res.slice(0, lastSlashIndex);
									lastSegmentLength = res.length - 1 - res.lastIndexOf(Fila.sep);
								}
								lastSlash = i;
								dots = 0;
								continue;
							}
						}
						else if (res.length === 2 || res.length === 1)
						{
							res = "";
							lastSegmentLength = 0;
							lastSlash = i;
							dots = 0;
							continue;
						}
					}
					if (allowAboveRoot)
					{
						if (res.length > 0)
							res += "/..";
						else
							res = "..";
						
						lastSegmentLength = 2;
					}
				}
				else
				{
					if (res.length > 0)
						res += Fila.sep + path.slice(lastSlash + 1, i);
					else
						res = path.slice(lastSlash + 1, i);
					
					lastSegmentLength = i - lastSlash - 1;
				}
				lastSlash = i;
				dots = 0;
			}
			else if (code === Char.dot && dots !== -1)
			{
				++dots;
			}
			else dots = -1;
		}
		return res;
	}
	
	/** */
	export function relative(from: string | Fila, to: string | Fila)
	{
		if (from === to)
			return "";
		
		from = posix.resolve(from instanceof Fila ? from.path : from);
		to = posix.resolve(to instanceof Fila ? to.path : to);
		
		if (from === to)
			return "";
		
		// Trim any leading backslashes
		var fromStart = 1;
		for (; fromStart < from.length; ++fromStart) 
			if (from.charCodeAt(fromStart) !== 47 /*/*/)
				break;
		
		var fromEnd = from.length;
		var fromLen = fromEnd - fromStart;
		
		// Trim any leading backslashes
		var toStart = 1;
		for (; toStart < to.length; ++toStart)
			if (to.charCodeAt(toStart) !== 47 /*/*/)
				break;
		
		var toEnd = to.length;
		var toLen = toEnd - toStart;
		
		// Compare paths to find the longest common path from root
		var length = fromLen < toLen ? fromLen : toLen;
		var lastCommonSep = -1;
		var i = 0;
		for (; i <= length; ++i)
		{
			if (i === length)
			{
				if (toLen > length)
				{
					if (to.charCodeAt(toStart + i) === 47 /*/*/ )
					{
						// We get here if `from` is the exact base path for `to`.
						// For example: from="/foo/bar"; to="/foo/bar/baz"
						return to.slice(toStart + i + 1);
					}
					else if (i === 0)
					{
						// We get here if `from` is the root
						// For example: from="/"; to="/foo"
						return to.slice(toStart + i);
					}
				}
				else if (fromLen > length)
				{
					if (from.charCodeAt(fromStart + i) === 47 /*/*/ )
					{
						// We get here if `to` is the exact base path for `from`.
						// For example: from="/foo/bar/baz"; to="/foo/bar"
						lastCommonSep = i;
					}
					else if (i === 0)
					{
						// We get here if `to` is the root.
						// For example: from="/foo"; to="/"
						lastCommonSep = 0;
					}
				}
				break;
			}
			
			var fromCode = from.charCodeAt(fromStart + i);
			var toCode = to.charCodeAt(toStart + i);
			
			if (fromCode !== toCode)
				break;
			
			else if (fromCode === 47 /*/*/ )
				lastCommonSep = i;
		}
		
		var out = "";
		// Generate the relative path based on the path difference between `to`
		// and `from`
		for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i)
		{
			if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/ )
			{
				if (out.length === 0)
					out += "..";
				else
					out += "/..";
			}
		}
		
		// Lastly, append the rest of the destination (`to`) path that comes after
		// the common path parts
		if (out.length > 0)
			return out + to.slice(toStart + lastCommonSep);
		
		toStart += lastCommonSep;
		if (to.charCodeAt(toStart) === 47 /*/*/ )
			++toStart;
		
		return to.slice(toStart);
	}
	
	const posix = {
		resolve(...args: string[])
		{
			var resolvedPath = "";
			var resolvedAbsolute = false;
			var cwd;
			
			for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--)
			{
				var path;
				if (i >= 0)
					path = args[i];
				else
				{
					if (cwd === undefined && typeof process === "object")
						cwd = process.cwd();
					
					path = cwd;
				}
				
				// Skip empty entries
				if (path.length === 0)
					continue;
				
				resolvedPath = path + "/" + resolvedPath;
				resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
			}
			
			// At this point the path should be resolved to a full absolute path, but
			// handle relative paths to be safe (might happen when process.cwd() fails)
			
			// Normalize the path
			resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
			
			if (resolvedAbsolute)
			{
				if (resolvedPath.length > 0)
					return "/" + resolvedPath;
				else
					return "/";
			}
			else if (resolvedPath.length > 0)
				return resolvedPath;
			
			return ".";
		},
	};
	
	declare const process: any;
	
	/** */
	const enum Char
	{
		dot = 46,
		slash = 47,
	}
	
	/** */
	export const enum Event
	{
		create = "create",
		modify = "modify",
		delete = "delete",
	}
}

//@ts-ignore CommonJS compatibility
typeof module === "object" && Object.assign(module.exports, { Fila });

// CommonJS module typings
declare module "@squaresapp/fila"
{
	export = Fila;
}
