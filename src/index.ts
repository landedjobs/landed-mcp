import { config } from '@/config';
import { createHttpServer } from '@/http/server';

function main(): void {
	const app = createHttpServer();
	const server = app.listen(config.http.port, () => {
		console.log(`[mcp] listening on :${config.http.port} — POST /mcp → ${config.api.base}`);
	});

	const shutdown = () => {
		server.close();
		process.exit(0);
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

main();
