import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageTemplatesDir = join(__dirname, '..', 'templates');

/**
 * Load template schema from project or package
 * @param {string} configDir - Project config directory
 * @param {string} templateName - Template name
 * @returns {Object|null} Schema object or null if not found
 */
export function loadTemplateSchema(configDir, templateName) {
  // Try project templates first
  const projectSchemaPath = join(configDir, 'templates', templateName, 'schema.json');
  if (existsSync(projectSchemaPath)) {
    try {
      return JSON.parse(readFileSync(projectSchemaPath, 'utf-8'));
    } catch (e) {
      return null;
    }
  }

  // Fall back to package templates
  const packageSchemaPath = join(packageTemplatesDir, templateName, 'schema.json');
  if (existsSync(packageSchemaPath)) {
    try {
      return JSON.parse(readFileSync(packageSchemaPath, 'utf-8'));
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Get list of known screenshot config fields (reserved keys)
 */
const RESERVED_KEYS = ['id', 'source', 'theme', 'layout', 'slices', 'headline', 'subheadline', 'headlines', 'subheadlines', 'background'];

/**
 * Compute Levenshtein distance between two strings
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find similar field name (for typo suggestions)
 * @param {string} field - Unknown field name
 * @param {string[]} validFields - List of valid field names
 * @returns {string|null} Similar field or null
 */
function findSimilarField(field, validFields) {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const valid of validFields) {
    const distance = levenshtein(field.toLowerCase(), valid.toLowerCase());
    if (distance < bestDistance && distance <= 2) {
      bestDistance = distance;
      bestMatch = valid;
    }
  }

  return bestMatch;
}

/**
 * Validate a single screenshot config against template schema
 * @param {Object} screenshot - Screenshot config object
 * @param {Object} schema - Template schema
 * @param {string} templateName - Template name for context
 * @returns {{ errors: string[], warnings: string[], suggestions: string[] }}
 */
export function validateScreenshotConfig(screenshot, schema, templateName) {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  if (!schema || !schema.fields) {
    return { errors, warnings, suggestions };
  }

  const schemaFields = Object.keys(schema.fields);
  const screenshotFields = Object.keys(screenshot).filter(k => k !== 'id' && k !== 'source');

  // Determine current mode for templates with modes (e.g., panorama)
  let activeMode = null;
  let deprecatedFields = [];
  let modeFields = schemaFields;

  if (schema.modes) {
    const slices = screenshot.slices || 1;

    for (const [modeName, modeConfig] of Object.entries(schema.modes)) {
      if (modeConfig.condition) {
        const { slices: slicesCondition } = modeConfig.condition;
        if (slicesCondition) {
          if (slicesCondition.eq !== undefined && slices === slicesCondition.eq) {
            activeMode = modeName;
          }
          if (slicesCondition.gt !== undefined && slices > slicesCondition.gt) {
            activeMode = modeName;
          }
        }
      }
    }

    if (activeMode && schema.modes[activeMode]) {
      const modeConfig = schema.modes[activeMode];
      if (modeConfig.fields) {
        modeFields = modeConfig.fields;
      }
      if (modeConfig.deprecates) {
        deprecatedFields = modeConfig.deprecates;
      }
    }
  }

  // Check for required fields
  for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
    if (fieldConfig.required && screenshot[fieldName] === undefined) {
      errors.push(`Missing required field: ${fieldName}`);
    }
  }

  // Check for unknown/unsupported fields
  for (const field of screenshotFields) {
    const fieldConfig = schema.fields[field];

    if (!fieldConfig) {
      // Field not in schema - check if it's a known reserved key for another template
      if (RESERVED_KEYS.includes(field)) {
        // It's a valid field but not for this template
        warnings.push(`Field "${field}" is not used by the "${templateName}" template`);
      } else {
        // Unknown field - might be a typo or custom content
        const similar = findSimilarField(field, [...schemaFields, ...RESERVED_KEYS]);
        if (similar) {
          suggestions.push(`Unknown field "${field}". Did you mean "${similar}"?`);
        }
        // Note: unknown fields are allowed as custom content, so no warning
      }
      continue;
    }

    // Check if field is deprecated in current mode
    if (deprecatedFields.includes(field) && screenshot[field] !== undefined) {
      warnings.push(`Field "${field}" is ignored in ${activeMode} mode (slices > 1). Use "${field}s" array instead.`);
    }

    // Validate field type
    const value = screenshot[field];
    if (value !== undefined) {
      const typeError = validateFieldType(field, value, fieldConfig);
      if (typeError) {
        errors.push(typeError);
      }
    }
  }

  // Mode-specific validation
  if (activeMode && schema.modes[activeMode]?.validation) {
    const validation = schema.modes[activeMode].validation;

    // Check array lengths match slices
    if (validation['headlines.length'] && screenshot.headlines) {
      const slices = screenshot.slices || 1;
      if (screenshot.headlines.length !== slices) {
        errors.push(`headlines array length (${screenshot.headlines.length}) must match slices (${slices})`);
      }
    }

    if (validation['subheadlines.length'] && screenshot.subheadlines) {
      const slices = screenshot.slices || 1;
      if (screenshot.subheadlines.length !== slices) {
        errors.push(`subheadlines array length (${screenshot.subheadlines.length}) must match slices (${slices})`);
      }
    }
  }

  // Check for panorama mode missing arrays
  if (schema.modes && screenshot.slices > 1) {
    if (!screenshot.headlines || !Array.isArray(screenshot.headlines)) {
      errors.push('Panorama mode (slices > 1) requires "headlines" array');
    }
    if (!screenshot.subheadlines || !Array.isArray(screenshot.subheadlines)) {
      errors.push('Panorama mode (slices > 1) requires "subheadlines" array');
    }
  }

  return { errors, warnings, suggestions };
}

/**
 * Validate field value against expected type
 * @param {string} fieldName
 * @param {any} value
 * @param {Object} fieldConfig
 * @returns {string|null} Error message or null
 */
function validateFieldType(fieldName, value, fieldConfig) {
  const { type, values, min, max, items } = fieldConfig;

  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return `Field "${fieldName}" must be a string, got ${typeof value}`;
      }
      break;

    case 'number':
      if (typeof value !== 'number') {
        return `Field "${fieldName}" must be a number, got ${typeof value}`;
      }
      if (min !== undefined && value < min) {
        return `Field "${fieldName}" must be at least ${min}`;
      }
      if (max !== undefined && value > max) {
        return `Field "${fieldName}" must be at most ${max}`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Field "${fieldName}" must be a boolean, got ${typeof value}`;
      }
      break;

    case 'enum':
      if (!values.includes(value)) {
        return `Field "${fieldName}" must be one of: ${values.join(', ')}`;
      }
      break;

    case 'path':
      if (typeof value !== 'string') {
        return `Field "${fieldName}" must be a path string, got ${typeof value}`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `Field "${fieldName}" must be an array, got ${typeof value}`;
      }
      if (items === 'string') {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== 'string') {
            return `Field "${fieldName}[${i}]" must be a string`;
          }
        }
      }
      break;
  }

  return null;
}

/**
 * Validate entire config file against template schema
 * @param {Object} config - Full storepix config object
 * @param {string} configDir - Config directory path
 * @returns {{ valid: boolean, errors: string[], warnings: string[], suggestions: string[] }}
 */
export function validateConfig(config, configDir) {
  const allErrors = [];
  const allWarnings = [];
  const allSuggestions = [];

  const templateName = config.template || 'default';
  const schema = loadTemplateSchema(configDir, templateName);

  if (!schema) {
    // No schema available - skip validation
    return { valid: true, errors: [], warnings: [], suggestions: [], hasSchema: false };
  }

  // Validate each screenshot
  for (const screenshot of config.screenshots || []) {
    const { errors, warnings, suggestions } = validateScreenshotConfig(screenshot, schema, templateName);

    for (const error of errors) {
      allErrors.push(`[${screenshot.id}] ${error}`);
    }
    for (const warning of warnings) {
      allWarnings.push(`[${screenshot.id}] ${warning}`);
    }
    for (const suggestion of suggestions) {
      allSuggestions.push(`[${screenshot.id}] ${suggestion}`);
    }
  }

  // Check for template-specific fields from other templates
  const otherTemplateFields = {
    background: ['photo'],
    slices: ['panorama'],
    headlines: ['panorama'],
    subheadlines: ['panorama'],
  };

  for (const screenshot of config.screenshots || []) {
    for (const [field, templates] of Object.entries(otherTemplateFields)) {
      if (screenshot[field] !== undefined && !templates.includes(templateName)) {
        allWarnings.push(`[${screenshot.id}] Field "${field}" is only used by ${templates.join('/')} template, not "${templateName}"`);
      }
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    suggestions: allSuggestions,
    hasSchema: true
  };
}

/**
 * Print config validation results to console
 * @param {Object} result - Result from validateConfig
 * @param {string} templateName - Template name for context
 */
export function printConfigValidation(result, templateName) {
  const { valid, errors, warnings, suggestions, hasSchema } = result;

  if (!hasSchema) {
    console.log(`\n  Note: Template "${templateName}" has no schema.json.`);
    console.log('  Run "npx storepix upgrade" to add config validation support.\n');
    return;
  }

  if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
    return; // All good, no output needed
  }

  console.log('\n  Config validation:');

  for (const error of errors) {
    console.log(`    \x1b[31m\u2717 ${error}\x1b[0m`);
  }

  for (const warning of warnings) {
    console.log(`    \x1b[33m\u26A0 ${warning}\x1b[0m`);
  }

  for (const suggestion of suggestions) {
    console.log(`    \x1b[36m\u2139 ${suggestion}\x1b[0m`);
  }

  if (!valid) {
    console.log('\n  Fix config errors or use --skip-config-validation to bypass.\n');
  } else if (warnings.length > 0 || suggestions.length > 0) {
    console.log('');
  }
}

/**
 * Get schema for a template
 * @param {string} configDir - Project config directory
 * @param {string} templateName - Template name
 * @returns {Object|null}
 */
export function getTemplateSchema(configDir, templateName) {
  return loadTemplateSchema(configDir, templateName);
}

/**
 * Get all fields defined in a schema
 * @param {Object} schema
 * @returns {string[]}
 */
export function getSchemaFields(schema) {
  if (!schema || !schema.fields) {
    return [];
  }
  return Object.keys(schema.fields);
}

/**
 * Get template-specific fields (not shared across all templates)
 * @param {Object} schema
 * @returns {string[]}
 */
export function getTemplateSpecificFields(schema) {
  if (!schema || !schema.fields) {
    return [];
  }
  return Object.entries(schema.fields)
    .filter(([_, config]) => config.templateSpecific)
    .map(([name]) => name);
}
