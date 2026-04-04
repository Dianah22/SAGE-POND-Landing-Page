import { httpServerHandler } from "cloudflare:node";
// Work around iconv-lite's Node stream helpers being disabled in the Worker bundle.
// It checks process.versions.node and then tries to load its stream helpers, which
// Wrangler disables for browser-like bundling, causing require_streams() to be undefined.
try {
	if (process?.versions?.node) {
		process.versions.node = undefined;
	}
} catch (_) {
	// Ignore if process.versions is read-only in this runtime.
}

await import("../server.js");

const port = Number(process.env.PORT) || 4000;
const handler = httpServerHandler({ port });
export default {
	fetch(request, env, ctx) {
		globalThis.__WORKER_ENV = env;
		const url = new URL(request.url);
		if (!url.pathname.startsWith("/api")) {
			if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
				return env.ASSETS.fetch(request);
			}
		}
		if (typeof handler === "function") {
			return handler(request, env, ctx);
		}
		return handler.fetch(request, env, ctx);
	}
};