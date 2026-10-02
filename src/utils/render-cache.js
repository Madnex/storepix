import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { platform, arch } from 'node:os';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
/** Opt-in cache for deterministic local projects. Hash contents, never just mtimes. */
export async function openRenderCache(configDir, outputDir, browserVersion) {
  const hash = createHash('sha256').update(`${platform()}/${arch()}/${browserVersion}/render-v1`);
  for (const file of ['./render.js', './render-jobs.js', './validation.js', '../commands/generate.js', '../../package.json', '../devices/upload-targets.js']) hash.update(await readFile(new URL(file, import.meta.url)));
  const excluded = resolve(outputDir);
  if (excluded === resolve(configDir)) throw new Error('Caching requires a separate output directory.');
  const walk = async dir => {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (['.git', '.storepix-cache.json', 'node_modules'].includes(entry.name) || entry.name.startsWith('.storepix-backup-') || path === excluded || path.startsWith(excluded + sep)) continue;
      if (entry.isSymbolicLink()) throw new Error('Caching does not support symlinked assets.');
      if (entry.isDirectory()) await walk(path);
      else { hash.update(path.slice(configDir.length)); hash.update(await readFile(path)); }
    }
  };
  await walk(configDir);
  const fingerprint = hash.digest('hex');
  const path = join(configDir, '.storepix-cache.json');
  let entries;
  try { entries = JSON.parse(await readFile(path, 'utf8')); } catch { entries = {}; }
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) entries = {};
  const next = {};
  const key = job => digest(JSON.stringify([fingerprint, job.url, job.paths]));
  return {
    async has(job) {
      const id = key(job), expected = entries[id];
      if (!Array.isArray(expected) || expected.length !== job.paths.length) return false;
      try {
        for (let i = 0; i < job.paths.length; i++) if (digest(await readFile(job.paths[i])) !== expected[i]) return false;
        next[id] = expected;
        return true;
      } catch { return false; }
    },
    put(job, images) { next[key(job)] = images.map(digest); },
    async save() { await writeFile(path, JSON.stringify(next)); }
  };
}
