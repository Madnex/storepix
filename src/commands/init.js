import { existsSync, mkdirSync, cpSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

  // Create config file
  const configContent = generateConfig(templateName);
  writeFileSync(join(targetDir, 'storepix.config.js'), configContent);

  // Create .gitignore
  const gitignoreContent = `# Generated screenshots
output/

# Node modules (if using local dependencies)
node_modules/
`;
  writeFileSync(join(targetDir, '.gitignore'), gitignoreContent);

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
  // iPhone: 'iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-6.3', 'iphone-6.1', 'iphone-5.5', 'iphone-4.7'
  // iPad: 'ipad-13', 'ipad-12.9', 'ipad-11'
  // Android: 'android-phone', 'android-tablet-7', 'android-tablet-10', 'android-wear'
  devices: ['iphone-6.5'],

  // Theme customization (injected as CSS variables)
  theme: {
    primary: '#007AFF',
    font: 'Inter',
  },

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
