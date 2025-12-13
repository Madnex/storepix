import { existsSync, cpSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageTemplatesDir = join(__dirname, '..', 'templates');

/**
 * Get list of available templates from the package
 * @returns {string[]} Array of template names
 */
export function getAvailableTemplates() {
  return readdirSync(packageTemplatesDir).filter(f =>
    !f.startsWith('.') &&
    f !== 'status-bar' &&
    existsSync(join(packageTemplatesDir, f, 'index.html'))
  );
}

/**
 * Check if a template exists in the project
 * @param {string} configDir - Project config directory
 * @param {string} templateName - Template name
 * @returns {boolean}
 */
export function templateExistsInProject(configDir, templateName) {
  const templateDir = join(configDir, 'templates', templateName);
  return existsSync(join(templateDir, 'index.html'));
}

/**
 * Try to add a template to the project automatically
 * @param {string} configDir - Project config directory
 * @param {string} templateName - Template name to add
 * @returns {{ success: boolean, message: string }}
 */
export function tryAddTemplate(configDir, templateName) {
  const available = getAvailableTemplates();

  // Check if template exists in package
  if (!available.includes(templateName)) {
    return {
      success: false,
      message: `Template "${templateName}" not found. Available: ${available.join(', ')}`
    };
  }

  const sourcePath = join(packageTemplatesDir, templateName);
  const targetPath = join(configDir, 'templates', templateName);

  // Copy template
  try {
    cpSync(sourcePath, targetPath, { recursive: true });
    return {
      success: true,
      message: `Added template "${templateName}" to your project.`
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to add template: ${err.message}`
    };
  }
}
