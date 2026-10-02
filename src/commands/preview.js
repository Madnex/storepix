import { chromium } from 'playwright';
import { dirname, resolve, sep } from 'node:path';
import { readFile } from 'node:fs/promises';
import { loadConfig, buildRenderJobs, ensureTemplates } from '../utils/render-jobs.js';
import { startServer } from '../utils/server.js';
import { FileWatcher } from '../utils/watcher.js';

/** Start preview; callers own the returned async close() handle. */
export async function preview(options = {}) {
  const configPath = resolve(options.config || './storepix/storepix.config.js');
  const configDir = dirname(configPath);
  let config = await loadConfig(configPath);
  let jobs = buildRenderJobs(config, configDir, options);
  ensureTemplates(jobs, configDir);
  let configError = null, watcher, browser, reload = Promise.resolve();
  const clients = new Set();
  const html = await readFile(new URL('../preview/index.html', import.meta.url), 'utf8');
  const server = await startServer(configDir, { port: Number(options.port ?? 3000), route: async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return true;
    }
    if (url.pathname === '/__storepix/jobs') {
      await reload;
      res.writeHead(configError ? 422 : 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(configError ? { error: configError.message } : { jobs: jobs.map(({ id, deviceKey, locale, template, viewport, url }) => ({ id, deviceKey, locale, template, viewport, url })) }));
      return true;
    }
    if (url.pathname === '/__storepix/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('data: connected\n\n'); clients.add(res);
      req.on('close', () => clients.delete(res)); return true;
    }
    return false;
  } });
  let closing;
  const close = () => closing ??= (async () => {
    try { await watcher?.stop(); await reload; }
    finally {
      for (const client of clients) client.end();
      clients.clear();
      try { await browser?.close(); } finally { await server.close(); }
    }
  })();
  try {
    if (options.watch) {
      watcher = new FileWatcher([configDir], { ignored: path => {
        const relative = path.slice(configDir.length).split(/[\\/]/).filter(Boolean);
        const output = resolve(configDir, config.output?.dir || 'output');
        return relative.some(part => part.startsWith('.') || part === 'node_modules') || path === output || path.startsWith(output + sep);
      } });
      watcher.on('error', error => console.error(`  Watch error: ${error.message}`));
      watcher.on('change', () => {
        reload = reload.then(async () => {
          try {
            const next = await loadConfig(configPath);
            const nextJobs = buildRenderJobs(next, configDir, options);
            ensureTemplates(nextJobs, configDir);
            config = next; jobs = nextJobs; configError = null;
          } catch (error) { configError = error; }
          for (const client of clients) client.write('data: reload\n\n');
        });
      });
      await new Promise((resolve, reject) => { watcher.once('ready', resolve); watcher.once('error', reject); watcher.start(); });
    }
    if (options.open) {
      browser = await chromium.launch({ headless: false });
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto(server.url);
    }
    console.log(`\n  storepix preview: ${server.url}${options.watch ? ' (watching)' : ''}\n`);
    return { url: server.url, close };
  } catch (error) { await close(); throw error; }
}
