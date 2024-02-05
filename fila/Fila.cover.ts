
namespace Cover
{
	/** */
	export async function coverFila()
	{
		const path = (globalThis as any).__TAURI__.path;
		const cwdString: string = await path.appDataDir();
		const cwd = new Fila(cwdString);
		debugger;
		
		const testFile = cwd.down("file.txt");
		await testFile.writeText(Date.now().toString());
		
		const text = await testFile.readText();
		console.log(text);
		
		const dir = cwd.down("dir");
		await dir.writeDirectory();
		
		await dir.down("a.txt").writeText(Date.now().toString());
		await dir.down("b.txt").writeText(Date.now().toString());
		await dir.down("c.txt").writeText(Date.now().toString());
		
		await dir.down("a").writeDirectory();
		await dir.down("b").writeDirectory();
		await dir.down("c").writeDirectory();
		
		{
			const file = dir.down("a.txt");
			const ac = await file.getAccessedTicks();
			const cr = await file.getCreatedTicks();
			const mo = await file.getModifiedTicks();
			const sz = await file.getSize();
			const dr = await file.getDirectory();
			debugger;
		}
		
		const contents = await dir.readDirectory();
		for (const entry of contents)
			console.log(entry.path);
		
		const unwatch = dir.watch((ev, fila) =>
		{
			console.log(ev + " - " + fila.path);
			unwatch;
		});
	}
	
	/** */
	export async function coverFilaTauri()
	{
		const fila = new Fila("FilaTauri", "+sample");
		fila.watch((ev, fila) =>
		{
			console.log(ev + ": " + fila.path);
		});
	}
	
	0 && ("__TAURI__" in globalThis) && setTimeout(() =>
	{
		document.body.addEventListener("click", coverFila, true);
	});
}

//@ts-ignore
if (typeof module === "object") Object.assign(module.exports, { Cover });
