import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import handler from 'serve-handler';

const bundled = fileURLToPath(new URL('../templates/', import.meta.url));

/** Listen only on loopback. Port 0 lets the OS allocate a free port atomically. */
export async function startServer(configDir, { port = 0, route } = {}) {
  const server = createServer(async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      if (route && await route(req, res)) return;
      const pathname = new URL(req.url, 'http://localhost').pathname;
      // Shared components work for old projects too, without overwriting user files.
      const shared = pathname.replace(/^\/templates\//, '/');
      if (/^\/(status-bar\/|fonts\/|storepix-content\.js$)/.test(shared)) {
        const projectPath = join(configDir, 'templates', shared);
        const root = existsSync(projectPath) ? join(configDir, 'templates') : bundled;
        const originalUrl = req.url;
        req.url = shared;
        try { await handler(req, res, { public: root, directoryListing: false, cleanUrls: false, symlinks: false }); }
        finally { req.url = originalUrl; }
        return;
      }
      await handler(req, res, { public: configDir, directoryListing: false, cleanUrls: false, symlinks: false });
    } catch (error) {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(error.message);
    }
  });
  await new Promise((resolve, reject) => {
    const onError = error => reject(error);
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => { server.off('error', onError); resolve(); });
  });
  let closing;
  return { server, url: `http://127.0.0.1:${server.address().port}`, close() {
    return closing ??= new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  } };
}
