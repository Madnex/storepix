import { presetUploadTargets } from '../devices/upload-targets.js';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { devices, defaultDevice } from '../devices/index.js';
import { resolveSource } from './resolve-source.js';
import { templateExistsInProject, tryAddTemplate, ensureSharedAssets } from './template-helper.js';
import { StorepixError } from './errors.js';

let revision = 0;
export async function loadConfig(configPath) {
  try {
    const config = (await import(`${pathToFileURL(resolve(configPath)).href}?revision=${++revision}`)).default;
    if (!config || !Array.isArray(config.screenshots) || !config.screenshots.length) {
      throw new Error('Add a non-empty screenshots array to your config.');
    }
    return config;
  } catch (cause) {
    throw new StorepixError('CONFIG', `Failed to load config ${configPath}: ${cause.message}`, { cause });
  }
}

function safeName(value, label) {
  if (typeof value !== 'string' || !/^[\p{L}\p{N}_][\p{L}\p{N}_.-]*$/u.test(value)) {
    throw new StorepixError('CONFIG', `Invalid ${label}: ${String(value)}`);
  }
  return value;
}

function assetUrl(source, configDir) {
  if (!source) return '';
  if (typeof source !== 'string') throw new StorepixError('CONFIG', 'Asset paths must be strings.');
  if (/^(https?:|data:)/.test(source)) return source;
  const file = resolve(configDir, source.replace(/^[/\\]+/, ''));
  if (!file.startsWith(resolve(configDir) + sep)) throw new StorepixError('CONFIG', `Asset is outside project: ${source}`);
  return '/' + file.slice(resolve(configDir).length + 1).split(sep).map(encodeURIComponent).join('/');
}

/** Single source of truth for preview and exported image parameters. */
export function buildRenderJobs(config, configDir, options = {}) {
  const keys = options.device ? [options.device] : (config.devices ?? [defaultDevice]);
  const locales = options.locale ? [options.locale] : (Object.keys(config.locales || {}).length ? Object.keys(config.locales) : [null]);
  if (!Array.isArray(keys) || !keys.length) throw new StorepixError('CONFIG', 'Configure at least one device.');
  if (options.locale && !Object.hasOwn(config.locales || {}, options.locale)) throw new StorepixError('CONFIG', `Unknown locale "${options.locale}"`);
  if (!Array.isArray(config.screenshots) || !config.screenshots.length) throw new StorepixError('CONFIG', 'No screenshots defined.');
  const jobs = [];
  const outputs = new Set();
  for (const key of keys) {
    if (!Object.hasOwn(devices, key)) throw new StorepixError('CONFIG', `Unknown device "${key}"`);
    const orientation = options.orientation || config.orientation || 'portrait';
    if (!['portrait', 'landscape'].includes(orientation)) throw new StorepixError('CONFIG', `Unknown orientation "${orientation}"`);
    const preset = devices[key];
    const device = orientation === 'landscape' && preset.type !== 'promotional' ? { ...preset, width: preset.height, height: preset.width } : preset;
    for (const locale of locales) {
      if (locale) safeName(locale, 'locale');
      for (const original of config.screenshots) {
        const id = safeName(original.id, 'screenshot id');
        const screenshot = { ...original, ...config.locales?.[locale]?.[id], id };
        const template = safeName(device.type === 'promotional' ? 'feature-graphic' : (options.template || config.template || 'default'), 'template');
        const slices = screenshot.slices ?? 1;
        if (!Number.isInteger(slices) || slices < 1 || slices > 10) throw new StorepixError('CONFIG', `${id}: slices must be an integer from 1 to 10.`);
        if (device.type === 'promotional' && slices !== 1) throw new StorepixError('CONFIG', 'Feature graphics cannot be panoramas.');
        if (!screenshot.source && device.type !== 'promotional') throw new StorepixError('CONFIG', `${id}: missing source path.`);
        const source = screenshot.source && !/^(https?:|data:)/.test(screenshot.source)
          ? resolveSource(screenshot.source, key, configDir).resolvedPath : screenshot.source;
        const reserved = new Set(['id', 'source', 'theme', 'layout', 'slices', 'headline', 'subheadline', 'headlines', 'subheadlines', 'background', 'logo']);
        const custom = Object.fromEntries(Object.entries(screenshot).filter(([name]) => !reserved.has(name)));
        const params = new URLSearchParams({
          screenshot: assetUrl(source, configDir), background: assetUrl(screenshot.background, configDir), logo: assetUrl(screenshot.logo, configDir),
          headline: screenshot.headline ?? '', subheadline: screenshot.subheadline ?? '',
          theme: screenshot.theme || 'light', layout: screenshot.layout || 'top',
          deviceWidth: device.width, deviceHeight: device.height, platform: device.platform,
          notchType: device.frame?.notch?.type || 'none', notchWidth: device.frame?.notch?.width || 0,
          notchHeight: device.frame?.notch?.height || 0, hasHomeButton: !!device.frame?.homeButton,
          slices, statusBar: config.statusBar?.enabled ?? false, statusBarTime: config.statusBar?.time ?? '9:41',
          statusBarBattery: config.statusBar?.battery ?? 100, statusBarShowPercent: config.statusBar?.showBatteryPercent ?? true,
          statusBarStyle: config.statusBar?.style || 'auto', themeJson: JSON.stringify(config.theme || {}), customContent: JSON.stringify(custom)
        });
        if (screenshot.headlines) params.set('headlines', JSON.stringify(screenshot.headlines));
        if (screenshot.subheadlines) params.set('subheadlines', JSON.stringify(screenshot.subheadlines));
        const outputDir = resolve(configDir, config.output?.dir || 'output', locale || '', key);
        const paths = Array.from({ length: slices }, (_, i) => resolve(outputDir, `${id}${slices > 1 ? `-${i + 1}` : ''}.png`));
        for (const path of paths) {
          if (outputs.has(path)) throw new StorepixError('CONFIG', `Duplicate output: ${path}`);
          outputs.add(path);
        }
        jobs.push({ id, deviceKey: key, device, uploadTarget: presetUploadTargets[key], locale, template, slices, screenshot: { ...screenshot, source },
          viewport: { width: device.width * slices, height: device.height }, paths,
          url: `/templates/${encodeURIComponent(template)}/index.html?${params}` });
      }
    }
  }
  return jobs;
}

export function ensureTemplates(jobs, configDir) {
  ensureSharedAssets(configDir);
  for (const template of new Set(jobs.map(job => job.template))) {
    if (!templateExistsInProject(configDir, template)) {
      const result = tryAddTemplate(configDir, template);
      if (!result.success) throw new StorepixError('TEMPLATE', result.message);
    }
  }
}
