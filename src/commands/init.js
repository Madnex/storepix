import { existsSync, mkdirSync, cpSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = join(__dirname, '..', 'templates');

export async function init(options) {
  const targetDir = options.dir;
  const templateName = options.template;

  console.log(`\n  Initializing storepix in ${targetDir}...\n`);

  // Check if directory already exists
  if (existsSync(targetDir)) {
    console.log(`  Directory ${targetDir} already exists.`);
    console.log('  Use a different directory or remove the existing one.\n');
    process.exit(1);
  }

  // Check if template exists
  const templatePath = join(templatesDir, templateName);
  if (!existsSync(templatePath)) {
    const available = readdirSync(templatesDir).filter(f =>
      !f.startsWith('.') && existsSync(join(templatesDir, f, 'index.html'))
    );
    console.log(`  Template "${templateName}" not found.`);
    console.log(`  Available templates: ${available.join(', ')}\n`);
    process.exit(1);
  }

  // Create directory structure
  mkdirSync(targetDir, { recursive: true });
  mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
  mkdirSync(join(targetDir, 'output'), { recursive: true });
  mkdirSync(join(targetDir, 'templates'), { recursive: true });

  // Copy template
  const targetTemplatePath = join(targetDir, 'templates', templateName);
  cpSync(templatePath, targetTemplatePath, { recursive: true });

  // Copy status-bar component (shared across templates)
  const statusBarSource = join(templatesDir, 'status-bar');
  const statusBarTarget = join(targetDir, 'templates', 'status-bar');
  if (existsSync(statusBarSource)) {
    cpSync(statusBarSource, statusBarTarget, { recursive: true });
  }

  // Create config file
  const configContent = generateConfig(templateName);
  writeFileSync(join(targetDir, 'storepix.config.js'), configContent);

  // Create .gitignore
  const gitignoreContent = `# Generated screenshots
output/

# Node modules (if using local dependencies)
node_modules/

# Upgrade backups
.storepix-backup-*
`;
  writeFileSync(join(targetDir, '.gitignore'), gitignoreContent);

  // Create version tracking file for upgrades
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));
  const versionInfo = {
    version: pkg.version,
    template: templateName,
    createdAt: new Date().toISOString(),
    files: getFileHashes(targetTemplatePath),
    statusBarFiles: existsSync(statusBarTarget) ? getFileHashes(statusBarTarget) : {}
  };
  writeFileSync(join(targetDir, '.storepix-version.json'), JSON.stringify(versionInfo, null, 2));

  console.log('  Created directory structure:');
  console.log(`    ${targetDir}/`);
  console.log(`    ├── storepix.config.js    # Your configuration`);
  console.log(`    ├── screenshots/          # Put your app screenshots here`);
  console.log(`    ├── output/               # Generated images appear here`);
  console.log(`    └── templates/`);
  console.log(`        └── ${templateName}/          # Customize freely!\n`);

  console.log('  Next steps:');
  console.log('    1. Add your app screenshots to ./storepix/screenshots/');
  console.log('    2. Edit storepix.config.js with your text and settings');
  console.log('    3. Run: npx storepix generate\n');

  console.log('  To preview your template:');
  console.log('    npx storepix preview\n');
}

function generateConfig(templateName) {
  return `// storepix configuration
// Documentation: https://github.com/Madnex/storepix

export default {
  // Template to use (from ./templates/)
  template: '${templateName}',

  // Output settings
  output: {
    dir: './output',
    format: 'png',
  },

  // Device sizes to generate
  // iPhone:
  //   'iphone-6.9'  - iPhone 16 Pro Max, 16 Plus, 15 Pro Max (REQUIRED for App Store)
  //   'iphone-6.7'  - iPhone 15 Pro Max
  //   'iphone-6.5'  - iPhone 14 Plus, 13 Pro Max, 12 Pro Max (fallback if no 6.9)
  //   'iphone-6.3'  - iPhone 16 Pro, 16, 15 Pro, 15, 14 Pro
  //   'iphone-6.1'  - iPhone 16e, 14, 13, 12, 11, X
  //   'iphone-5.5'  - iPhone 8 Plus, 7 Plus, 6S Plus (home button)
  //   'iphone-4.7'  - iPhone SE, 8, 7, 6S (home button)
  // iPad:
  //   'ipad-13'     - iPad Pro 13", iPad Air M3/M2 (REQUIRED for iPad apps)
  //   'ipad-12.9'   - iPad Pro 12.9" (older)
  //   'ipad-11'     - iPad Pro 11", iPad Air, iPad mini
  // Android:
  //   'android-phone', 'android-tablet-7', 'android-tablet-10', 'android-wear'
  devices: ['iphone-6.5'],

  // Theme customization (injected as CSS variables)
  theme: {
    primary: '#007AFF',
    font: 'Inter',
    // Home button styling (for iPhone 8 and earlier)
    // homeIndicatorLight: '#333333',
    // homeIndicatorDark: '#CCCCCC',
  },

  // Status bar injection (adds realistic status bar to screenshots)
  // Note: Use screenshots WITHOUT a visible status bar for best results.
  // This feature draws a status bar on top - it does not remove existing ones.
  // statusBar: {
  //   enabled: true,           // Set to true to show status bar
  //   time: '9:41',            // Displayed time
  //   battery: 100,            // Battery percentage (0-100)
  //   showBatteryPercent: true, // Show percentage number
  //   style: 'auto',           // 'light', 'dark', or 'auto' (matches theme)
  // },

  // Your screenshots
  screenshots: [
    {
      id: '01_home',
      source: './screenshots/home.png',
      headline: 'Your headline',
      subheadline: 'here',
      theme: 'light',
      layout: 'top',
    },
    // Add more screenshots...
  ],

  // Optional: Localization
  // Uncomment and customize to generate multiple languages
  // locales: {
  //   en: {
  //     '01_home': { headline: 'Your headline', subheadline: 'here' },
  //   },
  //   de: {
  //     '01_home': { headline: 'Deine Überschrift', subheadline: 'hier' },
  //   },
  // },
};
`;
}

/**
 * Get file hashes for version tracking
 * @param {string} dir - Directory to hash
 * @returns {Object} Map of relative paths to MD5 hashes
 */
function getFileHashes(dir) {
  const files = {};

  function walkDir(currentDir, baseDir) {
    if (!existsSync(currentDir)) return;

    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, baseDir);
      } else {
        const relativePath = fullPath.replace(baseDir + '/', '').replace(baseDir + '\\', '');
        const content = readFileSync(fullPath);
        files[relativePath] = createHash('md5').update(content).digest('hex');
      }
    }
  }

  walkDir(dir, dir);
  return files;
}
