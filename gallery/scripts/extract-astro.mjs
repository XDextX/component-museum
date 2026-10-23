// Reads the astro-render build and writes gallery/generated/astro-<name>.json for each component the
// Astro package exports with a contract: per case, the real HTML of the prerendered component and its
// Astro usage code (spec 004, RF-5 and RF-6; spec 009, RF-10).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { astroCases, usageSnippet } from '../lib/contract-args.ts';

const gallery = new URL('../', import.meta.url);
const contractsDir = new URL('../contracts/', gallery);
const page = readFileSync(new URL('astro-render/dist/index.html', gallery), 'utf8');

const entry = readFileSync(new URL('../packages/astro/index.js', gallery), 'utf8').replace(/\/\/.*$/gm, '');
const exported = new Set(
  [...entry.matchAll(/export\s*\{([^}]*)\}/g)].flatMap(([, names]) => names.split(',').map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean)),
);
const contracts = readdirSync(contractsDir)
  .filter((f) => f.endsWith('.contract.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, contractsDir), 'utf8')))
  .filter((c) => exported.has(c.name));

mkdirSync(new URL('generated/', gallery), { recursive: true });
for (const contract of contracts) {
  const slug = contract.name.toLowerCase();
  const cases = astroCases(contract).map(({ id, props }, _i, all) => {
    const open = new RegExp(`<div id="case-${slug}-${id}"[^>]*>`).exec(page);
    if (!open) throw new Error(`case ${slug}-${id} is missing from the astro-render build`);
    // A case runs to the next case's <div>, or to the end of the body; the last </div> before that is its wrapper.
    const from = open.index + open[0].length;
    const next = all.map((c) => page.indexOf(`<div id="case-${slug}-${c.id}"`, from)).filter((i) => i >= 0);
    const bodyEnd = page.indexOf('</body>', from);
    const to = Math.min(...next, bodyEnd < 0 ? page.length : bodyEnd);
    const inner = page.slice(from, to).trim().replace(/<\/div>$/, '');
    // Astro emits a component's script once per page, beside whichever case comes first: it is not the case.
    const html = inner.replace(/<script[\s\S]*?<\/script>/g, '').trim();
    if (!html) throw new Error(`case ${slug}-${id} has no markup in the astro-render build`);
    return { id, props, html, usage: usageSnippet('astro', props, contract) };
  });

  // Counted against the contract, not against astroCases: losing the disabled cases must fail here.
  const variant = contract.props.variant;
  if (variant) {
    const expected = variant.values.length * 2;
    if (cases.length !== expected) {
      throw new Error(`expected ${expected} Astro cases (each variant, normal and disabled), got ${cases.length}`);
    }
  }

  writeFileSync(new URL(`generated/astro-${slug}.json`, gallery), `${JSON.stringify(cases, null, 2)}\n`);
  console.log(`gallery/generated/astro-${slug}.json: ${cases.length} cases`);
}
