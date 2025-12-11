import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { createHash } from 'crypto';
import { diff, formatDiff, hasDifferences, countChanges } from '../utils/diff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageTemplatesDir = join(__dirname, '..', 'templates');
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

/**
 * Get all files in a directory recursively
 * @param {string} dir - Directory path
 * @param {string} baseDir - Base directory for relative paths
 * @returns {string[]} Array of relative file paths
 */
function getAllFiles(dir, baseDir = dir) {
  const files = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(fullPath.replace(baseDir + '/', '').replace(baseDir + '\\', ''));
    }
  }

  return files;
}

/**
 * Calculate MD5 hash of file content
 * @param {string} filePath - Path to file
 * @returns {string} MD5 hash
 */
function hashFile(filePath) {
  const content = readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}

/**
 * Get file hashes for a directory
 * @param {string} dir - Directory path
 * @returns {Object} Map of relative paths to hashes
 */
function getFileHashes(dir) {
  const files = {};
  const allFiles = getAllFiles(dir);

  for (const file of allFiles) {
    const fullPath = join(dir, file);
    files[file] = hashFile(fullPath);
  }

  return files;
}

/**
 * Analyze changes between user templates and package templates
 * @param {string} userDir - User's template directory
 * @param {string} packageDir - Package's template directory
 * @param {Object} originalHashes - Original file hashes from version file
 * @returns {Array} Array of change objects
 */
function analyzeChanges(userDir, packageDir, originalHashes = {}) {
  const changes = [];

  const userFiles = getAllFiles(userDir);
  const packageFiles = getAllFiles(packageDir);

  const allFiles = new Set([...userFiles, ...packageFiles]);

  for (const file of allFiles) {
    const userPath = join(userDir, file);
    const packagePath = join(packageDir, file);

    const userExists = existsSync(userPath);
    const packageExists = existsSync(packagePath);

    if (packageExists && !userExists) {
      // New file in package
      changes.push({ file, type: 'added' });
    } else if (userExists && !packageExists) {
      // File removed in package (user has it, package doesn't)
      changes.push({ file, type: 'removed' });
    } else if (userExists && packageExists) {
      const userHash = hashFile(userPath);
      const packageHash = hashFile(packagePath);

      if (userHash !== packageHash) {
        // File differs
        const originalHash = originalHashes[file];
        const userModified = originalHash && userHash !== originalHash;

        changes.push({ file, type: 'modified', userModified });
      }
    }
  }

  return changes;
}

/**
 * Prompt user for confirmation
 * @param {string} message - Prompt message
 * @returns {Promise<boolean>} User's answer
 */
async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export async function upgrade(options) {
  const targetDir = options.dir;
  const dryRun = options.dryRun || false;
  const force = options.force || false;
  const showDiff = options.showDiff || false;

  console.log('\n  storepix upgrade\n');

  // Check if project exists
  if (!existsSync(targetDir)) {
    console.log(`  Error: Directory not found: ${targetDir}`);
    console.log('  Run "npx storepix init" first to create a project.\n');
    process.exit(1);
  }

  // Load version info
  const versionFilePath = join(targetDir, '.storepix-version.json');
  let versionInfo = null;

  if (existsSync(versionFilePath)) {
    try {
      versionInfo = JSON.parse(readFileSync(versionFilePath, 'utf-8'));
    } catch {
      versionInfo = null;
    }
  }

  // Try to detect template if no version file
  if (!versionInfo) {
    console.log('  Note: No version tracking file found.');
    console.log('  This project may have been created with an older version of storepix.\n');

    const templatesDir = join(targetDir, 'templates');
    if (existsSync(templatesDir)) {
      const templates = readdirSync(templatesDir).filter(t =>
        t !== 'status-bar' && existsSync(join(templatesDir, t, 'index.html'))
      );
      if (templates.length > 0) {
        versionInfo = {
          version: '0.0.0',
          template: templates[0],
          files: {}
        };
        console.log(`  Detected template: ${templates[0]}\n`);
      }
    }

    if (!versionInfo) {
      console.log('  Error: Could not detect project template.\n');
      process.exit(1);
    }
  }

  console.log(`  Current version: ${versionInfo.version}`);
  console.log(`  Package version: ${pkg.version}`);
  console.log(`  Template: ${versionInfo.template}\n`);

  // Check if upgrade is needed
  if (versionInfo.version === pkg.version && !force) {
    console.log('  Already up to date!\n');
    return;
  }

  // Compare templates
  const userTemplateDir = join(targetDir, 'templates', versionInfo.template);
  const packageTemplateDir = join(packageTemplatesDir, versionInfo.template);

  if (!existsSync(packageTemplateDir)) {
    console.log(`  Error: Template "${versionInfo.template}" not found in package.`);
    const available = readdirSync(packageTemplatesDir)
      .filter(t => t !== 'status-bar' && existsSync(join(packageTemplatesDir, t, 'index.html')));
    console.log(`  Available templates: ${available.join(', ')}\n`);
    process.exit(1);
  }

  // Analyze changes in main template
  let changes = analyzeChanges(userTemplateDir, packageTemplateDir, versionInfo.files || {});

  // Also check status-bar directory
  const userStatusBarDir = join(targetDir, 'templates', 'status-bar');
  const packageStatusBarDir = join(packageTemplatesDir, 'status-bar');

  if (existsSync(packageStatusBarDir)) {
    const statusBarChanges = analyzeChanges(
      userStatusBarDir,
      packageStatusBarDir,
      versionInfo.statusBarFiles || {}
    );

    // Prefix with status-bar/ for display
    for (const change of statusBarChanges) {
      change.file = `status-bar/${change.file}`;
      changes.push(change);
    }
  }

  if (changes.length === 0) {
    console.log('  No template changes detected.\n');

    // Update version file anyway
    if (!dryRun) {
      updateVersionFile(targetDir, versionInfo.template);
      console.log('  Version file updated.\n');
    }
    return;
  }

  // Display changes
  console.log('  Changes detected:\n');

  const hasConflicts = changes.some(c => c.type === 'modified' && c.userModified);

  for (const change of changes) {
    let icon, color;
    if (change.type === 'added') {
      icon = '+';
      color = '\x1b[32m';
    } else if (change.type === 'removed') {
      icon = '-';
      color = '\x1b[31m';
    } else {
      icon = '~';
      color = '\x1b[33m';
    }

    console.log(`  ${color}${icon}\x1b[0m ${change.file}`);

    if (change.type === 'modified' && change.userModified) {
      console.log('    \x1b[33m(you have local modifications)\x1b[0m');
    }
  }

  console.log();

  // Show detailed diffs if requested
  if (showDiff) {
    for (const change of changes.filter(c => c.type === 'modified')) {
      const userPath = change.file.startsWith('status-bar/')
        ? join(targetDir, 'templates', change.file)
        : join(userTemplateDir, change.file);
      const packagePath = change.file.startsWith('status-bar/')
        ? join(packageTemplatesDir, change.file)
        : join(packageTemplateDir, change.file);

      if (existsSync(userPath) && existsSync(packagePath)) {
        const userContent = readFileSync(userPath, 'utf-8');
        const packageContent = readFileSync(packagePath, 'utf-8');

        if (hasDifferences(userContent, packageContent)) {
          console.log(`  === ${change.file} ===\n`);
          const diffResult = diff(userContent, packageContent);
          const { additions, removals } = countChanges(diffResult);
          console.log(`  \x1b[32m+${additions}\x1b[0m \x1b[31m-${removals}\x1b[0m lines changed\n`);
          console.log(formatDiff(diffResult));
          console.log('\n');
        }
      }
    }
  }

  if (dryRun) {
    console.log('  Dry run - no changes made.\n');
    console.log('  Run without --dry-run to apply these changes.\n');
    return;
  }

  // Warn about conflicts
  if (hasConflicts && !force) {
    console.log('  \x1b[33mWarning: Some files have local modifications.\x1b[0m');
    console.log('  Your changes will be backed up but may need manual merging.\n');
  }

  // Prompt for confirmation
  const proceed = await confirm('  Proceed with upgrade? (y/n) ');

  if (!proceed) {
    console.log('\n  Upgrade cancelled.\n');
    return;
  }

  // Create backup
  const timestamp = Date.now();
  const backupDir = join(targetDir, `.storepix-backup-${timestamp}`);
  mkdirSync(backupDir, { recursive: true });

  // Backup user's template
  cpSync(userTemplateDir, join(backupDir, versionInfo.template), { recursive: true });

  // Backup status-bar if it exists
  if (existsSync(userStatusBarDir)) {
    cpSync(userStatusBarDir, join(backupDir, 'status-bar'), { recursive: true });
  }

  console.log(`\n  Backup created: ${backupDir}`);

  // Apply changes
  let appliedCount = 0;

  for (const change of changes) {
    const isStatusBar = change.file.startsWith('status-bar/');
    const relativeFile = isStatusBar ? change.file.replace('status-bar/', '') : change.file;

    const userPath = isStatusBar
      ? join(targetDir, 'templates', change.file)
      : join(userTemplateDir, change.file);
    const packagePath = isStatusBar
      ? join(packageStatusBarDir, relativeFile)
      : join(packageTemplateDir, change.file);

    if (change.type === 'added') {
      // Add new file
      mkdirSync(dirname(userPath), { recursive: true });
      cpSync(packagePath, userPath);
      console.log(`  Added: ${change.file}`);
      appliedCount++;
    } else if (change.type === 'removed') {
      // Keep user's file - don't delete
      console.log(`  Kept: ${change.file} (removed in package version)`);
    } else if (change.type === 'modified') {
      if (change.userModified) {
        // Save user's version with .orig extension
        const userContent = readFileSync(userPath, 'utf-8');
        writeFileSync(userPath + '.orig', userContent);

        // Apply package version
        cpSync(packagePath, userPath);
        console.log(`  Updated: ${change.file} (your version saved as .orig)`);
      } else {
        // No local modifications - safe to overwrite
        cpSync(packagePath, userPath);
        console.log(`  Updated: ${change.file}`);
      }
      appliedCount++;
    }
  }

  // Update version file
  updateVersionFile(targetDir, versionInfo.template);

  console.log(`\n  Upgrade complete! ${appliedCount} file(s) updated.`);

  if (hasConflicts) {
    console.log('\n  \x1b[33mAction required:\x1b[0m');
    console.log('  Review .orig files for your local changes and merge as needed.');
    console.log('  Delete .orig files when done.\n');
  } else {
    console.log();
  }
}

/**
 * Update the version tracking file
 * @param {string} targetDir - Project directory
 * @param {string} templateName - Template name
 */
function updateVersionFile(targetDir, templateName) {
  const userTemplateDir = join(targetDir, 'templates', templateName);
  const userStatusBarDir = join(targetDir, 'templates', 'status-bar');

  const versionInfo = {
    version: pkg.version,
    template: templateName,
    updatedAt: new Date().toISOString(),
    files: getFileHashes(userTemplateDir)
  };

  // Also track status-bar files
  if (existsSync(userStatusBarDir)) {
    versionInfo.statusBarFiles = getFileHashes(userStatusBarDir);
  }

  writeFileSync(
    join(targetDir, '.storepix-version.json'),
    JSON.stringify(versionInfo, null, 2)
  );
}
