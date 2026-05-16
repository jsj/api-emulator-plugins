import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readmePath = join(root, 'README.md');
const configPath = join(root, '.README/provider-wall.json');
const check = process.argv.includes('--check');

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const columns = config.columns ?? 8;
const domains = config.domains ?? {};
const names = config.names ?? {};

function titleize(slug) {
  return slug
    .split('-')
    .map((part) => {
      if (part.length <= 3) return part.toUpperCase();
      return part[0].toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function readLabel(slug) {
  if (names[slug]) return names[slug];
  return titleize(slug);
}

function inferDomain(slug) {
  if (domains[slug]) return domains[slug];
  if (slug.startsWith('apple-')) return 'apple.com';
  if (slug.startsWith('google-')) return 'google.com';
  return `${slug.replaceAll('-', '')}.com`;
}

function providerPaths(slug) {
  const dir = join(root, `@${slug}`);
  const nested = join(dir, 'api-emulator');
  return {
    dir,
    readme: existsSync(join(nested, 'README.md')) ? join(nested, 'README.md') : null,
    module: existsSync(join(dir, 'api-emulator.mjs')) ? join(dir, 'api-emulator.mjs') : null,
    packageJson: existsSync(join(nested, 'package.json')) ? join(nested, 'package.json') : null,
  };
}

function providerLink(slug, paths) {
  if (paths.readme) return `./@${slug}/api-emulator/README.md`;
  if (paths.module) return `./@${slug}/api-emulator.mjs`;
  return `./@${slug}/api-emulator/package.json`;
}

const providers = readdirSync(root)
  .filter((name) => name.startsWith('@'))
  .map((name) => name.slice(1))
  .filter((slug) => statSync(join(root, `@${slug}`)).isDirectory())
  .map((slug) => {
    const paths = providerPaths(slug);
    if (!paths.readme && !paths.module && !paths.packageJson) return null;
    const label = readLabel(slug);
    const domain = inferDomain(slug);
    return {
      slug,
      label,
      link: providerLink(slug, paths),
      icon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.label.localeCompare(b.label));

const rows = [];
for (let i = 0; i < providers.length; i += columns) {
  rows.push(providers.slice(i, i + columns));
}

const table = [
  '<!-- provider-wall:start -->',
  '<table>',
  ...rows.flatMap((row) => [
    '  <tr>',
    ...row.map(
      (provider) =>
        `    <td align="center"><a href="${provider.link}"><img src="${provider.icon}" width="36" height="36" alt=""><br>${provider.label}</a></td>`,
    ),
    '  </tr>',
  ]),
  '</table>',
  '<!-- provider-wall:end -->',
].join('\n');

const readme = readFileSync(readmePath, 'utf8');
let replaced = false;
const next = readme.replace(
  /## Provider wall\n\n(?:<!-- provider-wall:start -->\n)?<table>[\s\S]*?<\/table>\n(?:<!-- provider-wall:end -->\n)?/,
  () => {
    replaced = true;
    return `## Provider wall\n\n${table}\n`;
  },
);

if (!replaced) {
  throw new Error('Could not find Provider wall table in README.md');
}

if (check) {
  if (next !== readme) {
    console.error('README.md provider wall is stale. Run: npm run provider-wall');
    process.exit(1);
  }
} else {
  writeFileSync(readmePath, next);
  console.log(`Updated provider wall with ${providers.length} providers.`);
}
