import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const cliPath = join(projectRoot, 'src', 'cli.js');

// Unique test directory for this test file
const testBaseDir = join(projectRoot, '.storepix-test-init');

// Clean up all test directories
function cleanup() {
  if (existsSync(testBaseDir)) {
    rmSync(testBaseDir, { recursive: true, force: true });
  }
}

describe('init command', () => {
  // Clean up after all tests
  after(() => {
    cleanup();
  });

  it('should create project structure with default template', () => {
    const testDir = join(testBaseDir, 'test-default');

    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    // Check directories created
    assert.ok(existsSync(testDir), 'Target directory should exist');
    assert.ok(existsSync(join(testDir, 'screenshots')), 'screenshots/ should exist');
    assert.ok(existsSync(join(testDir, 'output')), 'output/ should exist');
    assert.ok(existsSync(join(testDir, 'templates')), 'templates/ should exist');
    assert.ok(existsSync(join(testDir, 'templates', 'default')), 'templates/default/ should exist');

    // Check files created
    assert.ok(existsSync(join(testDir, 'storepix.config.js')), 'config should exist');
    assert.ok(existsSync(join(testDir, '.gitignore')), '.gitignore should exist');
    assert.ok(existsSync(join(testDir, '.storepix-version.json')), 'version file should exist');

    // Check template files
    assert.ok(existsSync(join(testDir, 'templates', 'default', 'index.html')), 'template index.html should exist');
    assert.ok(existsSync(join(testDir, 'templates', 'default', 'styles.css')), 'template styles.css should exist');

    // Check status-bar component
    assert.ok(existsSync(join(testDir, 'templates', 'status-bar')), 'status-bar should be copied');
  });

  it('should create project with minimal template', () => {
    const testDir = join(testBaseDir, 'test-minimal');

    execSync(`node ${cliPath} init --dir ${testDir} --template minimal`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    assert.ok(existsSync(join(testDir, 'templates', 'minimal')), 'minimal template should exist');
    assert.ok(existsSync(join(testDir, 'templates', 'minimal', 'index.html')));
  });

  it('should generate correct config for template', () => {
    const testDir = join(testBaseDir, 'test-config');

    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    const config = readFileSync(join(testDir, 'storepix.config.js'), 'utf-8');

    // Check config content
    assert.ok(config.includes("template: 'default'"), 'Config should specify default template');
    assert.ok(config.includes('devices:'), 'Config should have devices');
    assert.ok(config.includes('screenshots:'), 'Config should have screenshots');
    assert.ok(config.includes('theme:'), 'Config should have theme');
  });

  it('should create version tracking file with correct structure', () => {
    const testDir = join(testBaseDir, 'test-version');

    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    const versionFile = JSON.parse(
      readFileSync(join(testDir, '.storepix-version.json'), 'utf-8')
    );

    assert.ok(versionFile.version, 'Should have version');
    assert.strictEqual(versionFile.template, 'default', 'Should have template name');
    assert.ok(versionFile.createdAt, 'Should have createdAt timestamp');
    assert.ok(versionFile.files, 'Should have files hash map');
    assert.ok(typeof versionFile.files === 'object', 'files should be an object');
  });

  it('should create .gitignore with correct content', () => {
    const testDir = join(testBaseDir, 'test-gitignore');

    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    const gitignore = readFileSync(join(testDir, '.gitignore'), 'utf-8');

    assert.ok(gitignore.includes('output/'), '.gitignore should ignore output/');
    assert.ok(gitignore.includes('node_modules/'), '.gitignore should ignore node_modules/');
  });

  it('should fail if directory already exists', () => {
    const testDir = join(testBaseDir, 'test-exists');

    // Create directory first
    execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    // Try to init again - should fail
    let threw = false;
    try {
      execSync(`node ${cliPath} init --dir ${testDir} --template default`, {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    } catch (err) {
      threw = true;
      // Check that the error is about directory existing
      assert.strictEqual(err.status, 1, 'Should exit with code 1');
    }
    assert.ok(threw, 'Should throw an error');
  });

  it('should fail for invalid template', () => {
    const testDir = join(testBaseDir, 'test-invalid');

    assert.throws(() => {
      execSync(`node ${cliPath} init --dir ${testDir} --template nonexistent`, {
        cwd: projectRoot,
        stdio: 'pipe'
      });
    }, /error|not found/i);
  });

  it('should work with all available templates', () => {
    // All templates that have index.html (excluding status-bar component)
    const templates = ['default', 'minimal', 'photo', 'panorama'];

    for (const template of templates) {
      const testDir = join(testBaseDir, `test-all-${template}`);

      execSync(`node ${cliPath} init --dir ${testDir} --template ${template}`, {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      assert.ok(
        existsSync(join(testDir, 'templates', template, 'index.html')),
        `${template} template should have index.html`
      );
    }
  });
});
