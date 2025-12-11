#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init.js';
import { generate } from './commands/generate.js';
import { preview } from './commands/preview.js';
import { upgrade } from './commands/upgrade.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('storepix')
  .description('Generate beautiful App Store screenshots with HTML/CSS templates')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize storepix in your project')
  .option('-t, --template <name>', 'Template to use', 'default')
  .option('-d, --dir <path>', 'Directory to initialize in', './storepix')
  .action(init);

program
  .command('generate')
  .description('Generate App Store screenshots')
  .option('-c, --config <path>', 'Path to config file', './storepix/storepix.config.js')
  .option('-l, --locale <locale>', 'Generate only specific locale')
  .option('-d, --device <device>', 'Generate only specific device size')
  .option('--no-parallel', 'Disable parallel generation')
  .option('--skip-validation', 'Skip screenshot dimension validation')
  .action(generate);

program
  .command('preview')
  .description('Start preview server for template development')
  .option('-c, --config <path>', 'Path to config file', './storepix/storepix.config.js')
  .option('-p, --port <port>', 'Port to run server on', '3000')
  .option('-w, --watch', 'Enable watch mode with hot reload')
  .option('-o, --open', 'Open browser window at device size')
  .option('-d, --device <device>', 'Device size for browser window (default: first in config)')
  .action(preview);

program
  .command('upgrade')
  .description('Upgrade templates to latest version')
  .option('-d, --dir <path>', 'Project directory', './storepix')
  .option('--dry-run', 'Show what would be changed without making changes')
  .option('--force', 'Force upgrade even if already up to date')
  .option('--show-diff', 'Show detailed diff of changes')
  .action(upgrade);

program.parse();
