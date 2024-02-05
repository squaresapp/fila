
namespace Cover
{
	/** */
	export async function coverFilaNode()
	{
		const fila = new Fila(process.cwd(), "FilaNode", "+sample");
		const x = fila.down("x");
		await fila.isDirectory();
		
		fila.watch((ev, fila) =>
		{
			console.log(ev + ": " + fila.path);
		});
		
		process.stdin.resume();
	}
}

typeof module === "object" && Object.assign(module.exports, { Cover });
