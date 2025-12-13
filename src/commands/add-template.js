import { existsSync, cpSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = join(__dirname, '..', 'templates');

export async function addTemplate(templateName, options) {
  const projectDir = options.dir;
  const targetTemplatesDir = join(projectDir, 'templates');

  // Check if project exists
  if (!existsSync(targetTemplatesDir)) {
    console.log(`\n  Error: No storepix project found at ${projectDir}`);
    console.log('  Run "npx storepix init" first to create a project.\n');
    process.exit(1);
  }

  // Get available templates (excluding status-bar which is a component)
  const available = readdirSync(templatesDir).filter(f =>
    !f.startsWith('.') &&
    f !== 'status-bar' &&
    existsSync(join(templatesDir, f, 'index.html'))
  );

  // Check if template exists in package
  const sourcePath = join(templatesDir, templateName);
  if (!existsSync(sourcePath) || !existsSync(join(sourcePath, 'index.html'))) {
    console.log(`\n  Error: Template "${templateName}" not found.`);
    console.log(`  Available templates: ${available.join(', ')}\n`);
    process.exit(1);
  }

  // Check if template already exists in project
  const targetPath = join(targetTemplatesDir, templateName);
  if (existsSync(targetPath)) {
    console.log(`\n  Template "${templateName}" already exists in your project.`);
    console.log(`  Location: ${targetPath}\n`);
    process.exit(0);
  }

  // Copy template
  cpSync(sourcePath, targetPath, { recursive: true });

  console.log(`\n  Added template "${templateName}" to your project.`);
  console.log(`  Location: ${targetPath}\n`);
  console.log('  To use this template, update your storepix.config.js:');
  console.log(`    template: '${templateName}'\n`);
}
