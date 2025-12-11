import { createServer } from 'http';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join, extname } from 'path';
import { pathToFileURL } from 'url';
import handler from 'serve-handler';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export async function preview(options) {
  const configPath = resolve(options.config);
  const port = parseInt(options.port, 10);

  // Load config
  if (!existsSync(configPath)) {
    console.log(`\n  Config file not found: ${configPath}`);
    console.log('  Run "npx storepix init" first to create a project.\n');
    process.exit(1);
  }

  const configDir = dirname(configPath);
  const config = (await import(pathToFileURL(configPath).href)).default;

  // Template path
  const templateDir = join(configDir, 'templates', config.template || 'default');

  if (!existsSync(templateDir)) {
    console.log(`  Template not found: ${templateDir}\n`);
    process.exit(1);
  }

  // Create server that serves both template and screenshot directories
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    // Serve files from template directory by default
    // Also allow access to screenshots directory
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

  server.listen(port, () => {
    console.log(`\n  storepix preview server running\n`);
    console.log(`  Template: ${config.template}`);
    console.log(`  URL: http://localhost:${port}\n`);

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
}
