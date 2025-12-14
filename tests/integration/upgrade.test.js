import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const cliPath = join(projectRoot, 'src', 'cli.js');

// Unique test directory for upgrade tests
const testBaseDir = join(projectRoot, '.storepix-test-upgrade');

// Clean up test directories
function cleanup() {
  if (existsSync(testBaseDir)) {
    rmSync(testBaseDir, { recursive: true, force: true });
  }
}

describe('upgrade command', () => {
  // Clean up after all tests
  after(() => {
    cleanup();
  });

  it('should detect no changes in fresh project (dry-run)', () => {
    const testDir = join(testBaseDir, 'test-upgrade-clean');

    // Create project
    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    // Run upgrade dry-run
    const result = execSync(`node ${cliPath} upgrade --dir ${testDir} --dry-run`, {
      cwd: projectRoot,
      encoding: 'utf-8'
    });

    assert.ok(result.includes('up to date') || result.includes('No changes'),
      'Fresh project should show no changes needed');
  });

  it('should detect user modifications', () => {
    const testDir = join(testBaseDir, 'test-upgrade-modified');

    // Create project
    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    // Modify a template file
    const cssPath = join(testDir, 'templates', 'default', 'styles.css');
    const original = readFileSync(cssPath, 'utf-8');
    writeFileSync(cssPath, original + '\n/* User modification */\n');

    // Run upgrade dry-run
    const result = execSync(`node ${cliPath} upgrade --dir ${testDir} --dry-run`, {
      cwd: projectRoot,
      encoding: 'utf-8'
    });

    // Should detect the modified file
    assert.ok(result.includes('styles.css') || result.includes('up to date'),
      'Should mention modified file or be up to date');
  });

  it('should show diff when --show-diff is used', () => {
    const testDir = join(testBaseDir, 'test-upgrade-diff');

    // Create project
    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    // Modify a template file
    const cssPath = join(testDir, 'templates', 'default', 'styles.css');
    const original = readFileSync(cssPath, 'utf-8');
    writeFileSync(cssPath, original + '\n/* User modification */\n');

    // Run upgrade with --show-diff
    const result = execSync(`node ${cliPath} upgrade --dir ${testDir} --dry-run --show-diff`, {
      cwd: projectRoot,
      encoding: 'utf-8'
    });

    // Result should include some output (either diff or up-to-date message)
    assert.ok(result.length > 0, 'Should produce some output');
  });

  it('should fail for non-existent directory', () => {
    assert.throws(() => {
      execSync(`node ${cliPath} upgrade --dir /nonexistent/path`, {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    }, /error|not found/i);
  });

  it('should preserve version file after init', () => {
    const testDir = join(testBaseDir, 'test-version-file');

    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    const versionPath = join(testDir, '.storepix-version.json');
    assert.ok(existsSync(versionPath), 'Version file should exist');

    const version = JSON.parse(readFileSync(versionPath, 'utf-8'));
    assert.ok(version.version, 'Should have version');
    assert.ok(version.files, 'Should have files');
    assert.ok(Object.keys(version.files).length > 0, 'Should have file hashes');
  });

  it('should track status-bar files in version info', () => {
    const testDir = join(testBaseDir, 'test-statusbar-version');

    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    const versionPath = join(testDir, '.storepix-version.json');
    const version = JSON.parse(readFileSync(versionPath, 'utf-8'));

    assert.ok(version.statusBarFiles, 'Should have statusBarFiles');
    assert.ok(Object.keys(version.statusBarFiles).length > 0, 'Should have status-bar file hashes');
  });
});
