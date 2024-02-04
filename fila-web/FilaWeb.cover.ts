
namespace Cover
{
	/** */
	export async function coverFilaWeb()
	{
		const dir = new Fila("dir");
		dir.writeDirectory();
		
		const filaText = dir.down("file.txt");
		await filaText.writeText("yay!");
		
		const filaBinary = dir.down("file.bin");
		const buffer = new Uint8Array([0, 1, 2]);
		await filaBinary.writeBinary(buffer);
		
		const contents = await dir.readDirectory();
		for (const fila of contents)
			console.log(fila.path);
		
		await dir.delete();
		debugger;
	}
	
	declare const module: any;
	typeof module === "object" && Object.assign(module.exports, { Cover });
}
