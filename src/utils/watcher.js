import chokidar from 'chokidar';
import { EventEmitter } from 'events';

/**
 * File watcher utility for hot reload
 */
export class FileWatcher extends EventEmitter {
  constructor(paths, options = {}) {
    super();
    this.paths = paths;
    this.options = {
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      },
      ...options
    };
    this.watcher = null;
  }

  /**
   * Start watching files
   * @returns {FileWatcher} this instance for chaining
   */
  start() {
    this.watcher = chokidar.watch(this.paths, this.options);

    this.watcher
      .on('change', (path) => this.emit('change', { type: 'change', path }))
      .on('add', (path) => this.emit('change', { type: 'add', path }))
      .on('unlink', (path) => this.emit('change', { type: 'unlink', path }))
      .on('error', (error) => this.emit('error', error))
      .on('ready', () => this.emit('ready'));

    return this;
  }

  /**
   * Stop watching files
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

/**
 * Categorize file changes for smart reloading
 * @param {string} path - Changed file path
 * @param {string} configDir - Config directory root
 * @returns {string} Change category: 'template', 'config', 'screenshot', 'other'
 */
export function categorizeChange(path, configDir) {
  const relativePath = path.replace(configDir, '').replace(/^[\/\\]/, '');

  if (relativePath.startsWith('templates/')) {
    return 'template';
  }

  if (relativePath.includes('storepix.config')) {
    return 'config';
  }

  if (relativePath.startsWith('screenshots/')) {
    return 'screenshot';
  }

  return 'other';
}
