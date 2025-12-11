import { createServer } from 'http';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { pathToFileURL } from 'url';
import handler from 'serve-handler';

// SSE clients for watch mode
let sseClients = [];

/**
 * Send message to all SSE clients
 * @param {Object} data - Data to send
 */
function broadcastSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch {
      // Client disconnected
    }
  });
}

/**
 * Reload script to inject into HTML when watch mode is active
 */
const RELOAD_SCRIPT = `
<script>
(function() {
  var evtSource = new EventSource('/__storepix_sse');
  evtSource.onmessage = function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'reload') {
        console.log('[storepix] Reloading...', data.category || '');
        window.location.reload();
      }
    } catch (e) {
      console.error('[storepix] SSE parse error:', e);
    }
  };
  evtSource.onerror = function() {
    console.log('[storepix] Connection lost, reconnecting...');
  };
  console.log('[storepix] Watch mode active');
})();
</script>
`;

export async function preview(options) {
  const configPath = resolve(options.config);
  const port = parseInt(options.port, 10);
  const watchMode = options.watch || false;

  // Load config
  if (!existsSync(configPath)) {
    console.log(`\n  Config file not found: ${configPath}`);
    console.log('  Run "npx storepix init" first to create a project.\n');
    process.exit(1);
  }

  const configDir = dirname(configPath);
  let config = (await import(pathToFileURL(configPath).href)).default;

  // Template path
  const templateDir = join(configDir, 'templates', config.template || 'default');

  if (!existsSync(templateDir)) {
    console.log(`  Template not found: ${templateDir}\n`);
    process.exit(1);
  }

  // Create server
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    // SSE endpoint for watch mode
    if (watchMode && pathname === '/__storepix_sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial ping
      res.write('data: {"type":"connected"}\n\n');

      sseClients.push(res);

      req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
      });

      return;
    }

    // For watch mode, inject reload script into HTML responses
    if (watchMode && (pathname === '/' || pathname === '/index.html' || pathname.endsWith('.html'))) {
      try {
        let filePath;
        if (pathname === '/' || pathname === '/index.html') {
          filePath = join(configDir, 'templates', config.template || 'default', 'index.html');
        } else {
          filePath = join(configDir, pathname.slice(1));
        }

        if (existsSync(filePath)) {
          let html = readFileSync(filePath, 'utf-8');
          // Inject reload script before </body>
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${RELOAD_SCRIPT}</body>`);
          } else {
            html += RELOAD_SCRIPT;
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }
      } catch (err) {
        // Fall through to serve-handler
      }
    }

    // Default file serving
    try {
      await handler(req, res, {
        public: configDir,
        directoryListing: false,
        rewrites: [
          { source: '/', destination: `/templates/${config.template}/index.html` },
          { source: '/index.html', destination: `/templates/${config.template}/index.html` },
        ]
      });
    } catch (err) {
      res.statusCode = 500;
      res.end('Server error');
    }
  });

  // Start file watcher in watch mode
  let watcher = null;
  if (watchMode) {
    try {
      const { FileWatcher, categorizeChange } = await import('../utils/watcher.js');

      const watchPaths = [
        join(configDir, 'templates'),
        join(configDir, 'screenshots'),
        configPath
      ];

      watcher = new FileWatcher(watchPaths).start();

      watcher.on('change', async ({ type, path }) => {
        const category = categorizeChange(path, configDir);
        const relativePath = path.replace(configDir, '').replace(/^[\/\\]/, '');

        console.log(`  [watch] ${type}: ${relativePath}`);

        // Reload config if config file changed
        if (category === 'config') {
          try {
            // Use timestamp to bust module cache
            const configUrl = `${pathToFileURL(configPath).href}?t=${Date.now()}`;
            config = (await import(configUrl)).default;
            console.log('  [watch] Config reloaded');
          } catch (err) {
            console.log(`  [watch] Config error: ${err.message}`);
          }
        }

        // Notify connected browsers to reload
        broadcastSSE({ type: 'reload', category, path: relativePath });
      });

      watcher.on('error', (err) => {
        console.log(`  [watch] Error: ${err.message}`);
      });

      watcher.on('ready', () => {
        console.log('  [watch] Watching for changes...\n');
      });

    } catch (err) {
      console.log(`\n  Warning: Watch mode requires chokidar package.`);
      console.log(`  Install it with: npm install chokidar\n`);
      console.log(`  Starting preview without watch mode...\n`);
    }
  }

  server.listen(port, () => {
    console.log(`\n  storepix preview server running\n`);
    console.log(`  Template: ${config.template}`);
    console.log(`  URL: http://localhost:${port}`);
    if (watchMode && watcher) {
      console.log(`  Watch mode: enabled`);
    }
    console.log();

    // Build example URL with first screenshot
    if (config.screenshots && config.screenshots.length > 0) {
      const s = config.screenshots[0];
      const params = new URLSearchParams({
        screenshot: s.source,
        headline: s.headline,
        subheadline: s.subheadline,
        theme: s.theme || 'light',
        layout: s.layout || 'top'
      });
      console.log(`  Preview first screenshot:`);
      console.log(`  http://localhost:${port}?${params.toString()}\n`);
    }

    console.log('  Press Ctrl+C to stop\n');
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n  Shutting down...');
    if (watcher) watcher.stop();
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (watcher) watcher.stop();
    server.close();
    process.exit(0);
  });
}
