import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(root, 'api-emulator.catalog.json');
const check = process.argv.includes('--check');
const force = process.argv.includes('--force');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')).plugins ?? {};

function titleize(slug) {
  return slug
    .split('-')
    .map((part) => {
      const upper = new Set(['adp', 'api', 'aws', 'oci', 'sec', 'usaa']);
      if (upper.has(part)) return part.toUpperCase();
      if (part === 'arxiv') return 'arXiv';
      return part[0].toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function readModuleSource(slug, specifier) {
  const candidates = [
    join(root, `@${slug}/api-emulator.mjs`),
    specifier ? join(root, specifier) : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
  }
  return '';
}

function routeLines(source) {
  const routes = [];
  const routePattern = /app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  for (const match of source.matchAll(routePattern)) {
    routes.push(`- \`${match[1].toUpperCase()} ${match[2]}\``);
  }
  return [...new Set(routes)].slice(0, 40);
}

function authLine(source) {
  if (/authorization|bearer|api[-_ ]?key|x-api-key/i.test(source)) {
    return 'Uses fake local credentials only; provide any deterministic bearer token or API key expected by the client under test.';
  }
  return 'No production credentials are required. Use fake local credentials in client tests.';
}

function seedBlock(slug) {
  return `\`\`\`yaml\n${slug}:\n  # Add provider-specific seed state here.\n\`\`\``;
}

function readmeFor(slug, entry) {
  const packageName = entry.packageName ?? `@api-emulator/${slug}`;
  const title = packageName.startsWith('@api-emulator/') ? packageName : `@api-emulator/${slug}`;
  const label = titleize(slug);
  const source = readModuleSource(slug, entry.specifier);
  const routes = routeLines(source);
  const endpoints = routes.length ? routes.join('\n') : '- See the emulator source for the supported local API surface.';
  const runSpecifier = entry.specifier ?? `./@${slug}/api-emulator.mjs`;
  const officialDocs = source.match(/docs:\s*['"`]([^'"`]+)['"`]/)?.[1];
  const docsLink = officialDocs ? `- [Official API docs](${officialDocs})\n` : '';

  return `# ${title}\n\n${entry.description ?? `${label} API emulator.`}\n\nPart of [emulate](https://github.com/jsj/api-emulator) — local drop-in replacement services for CI and no-network sandboxes.\n\n## Install\n\n\`\`\`bash\nnpm install ${packageName}\n\`\`\`\n\n## Run\n\n\`\`\`bash\nnpx -p api-emulator api --plugin ${runSpecifier} --service ${slug}\n\`\`\`\n\n## Endpoints\n\n${endpoints}\n\n## Auth\n\n${authLine(source)}\n\n## Seed Configuration\n\n${seedBlock(slug)}\n\n## Links\n\n${docsLink}- [api-emulator](https://github.com/jsj/api-emulator)\n`;
}

const stale = [];
let written = 0;

for (const [slug, entry] of Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b))) {
  if (entry.kind !== 'package') continue;

  const readmePath = join(root, `@${slug}/api-emulator/README.md`);
  const next = readmeFor(slug, entry);
  const current = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : null;

  if (current === next) continue;
  if (current && !force) continue;

  if (check) {
    stale.push(readmePath);
    continue;
  }

  mkdirSync(dirname(readmePath), { recursive: true });
  writeFileSync(readmePath, next);
  written++;
}

if (check) {
  const missing = Object.entries(catalog)
    .filter(([, entry]) => entry.kind === 'package')
    .map(([slug]) => join(root, `@${slug}/api-emulator/README.md`))
    .filter((readmePath) => !existsSync(readmePath));
  if (missing.length || stale.length) {
    console.error(`Provider README check failed: ${missing.length} missing, ${stale.length} stale.`);
    process.exit(1);
  }
} else {
  console.log(`Generated ${written} provider README files.`);
}
