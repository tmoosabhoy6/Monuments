// The launch gate (SPEC §10.2). Fails while the config is a draft or any value is unconfirmed,
// naming each one, so a site with sample prices or unapproved policies cannot go live.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unconfirmed } from '../src/js/builder/config.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const raw = JSON.parse(await readFile(root + 'content/site.config.json', 'utf8'));
const problems = [];
if (raw.draft !== false) problems.push('draft is true (set "draft": false once everything below is confirmed)');
for (const path of unconfirmed(raw)) problems.push(`${path} is not confirmed`);

if (problems.length) {
  console.error(`Launch blocked: ${problems.length} item${problems.length === 1 ? '' : 's'} in content/site.config.json:\n` +
    problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('Launch gate passed: not a draft, every value confirmed.');
