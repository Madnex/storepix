import { readFileSync, writeFileSync } from 'node:fs';
import { getAvailableTemplates } from '../src/utils/template-helper.js';
const rows = getAvailableTemplates().sort().map(name => {
  const schema = JSON.parse(readFileSync(new URL(`../src/templates/${name}/schema.json`, import.meta.url)));
  return `| \`${name}\` | ${schema.description.replaceAll('|', '\\|')} |`;
});
const block = `<!-- templates:start -->\n| Template | Description |\n| --- | --- |\n${rows.join('\n')}\n<!-- templates:end -->`;
const path = new URL('../README.md', import.meta.url);
const current = readFileSync(path, 'utf8');
const next = current.replace(/<!-- templates:start -->[\s\S]*?<!-- templates:end -->/, block);
if (process.argv.includes('--check')) {
  if (next !== current || !current.includes('<!-- templates:start -->')) { console.error('Run npm run docs:templates to update the README template list.'); process.exitCode = 1; }
} else writeFileSync(path, next);
