
namespace Cover
{
	/** */
	export function coverFilaNode()
	{
		const fila = new Fila(process.cwd(), "FilaNode", "+sample");
		fila.watch((ev, fila) =>
		{
			console.log(ev + ": " + fila.path);
		});
		
		process.stdin.resume();
	}
}

typeof module === "object" && Object.assign(module.exports, { Cover });
