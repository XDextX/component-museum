// Reads the astro-render build and writes gallery/generated/astro-button.json: per case, the real
// HTML of the prerendered Button and its Astro usage code (spec 004, RF-5 and RF-6).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { astroCases, usageSnippet } from '../lib/contract-args.ts';

const gallery = new URL('../', import.meta.url);
const contract = JSON.parse(readFileSync(new URL('../contracts/button.contract.json', gallery), 'utf8'));
const page = readFileSync(new URL('astro-render/dist/index.html', gallery), 'utf8');

const cases = astroCases(contract).map(({ id, props }) => {
  const found = new RegExp(`<div id="case-${id}"[^>]*>([\\s\\S]*?)</div>`).exec(page);
  if (!found) throw new Error(`case ${id} is missing from the astro-render build`);
  // Only the <button>: Astro emits the click script once per page, beside whichever case comes first.
  const button = /<button[\s\S]*?<\/button>/.exec(found[1]);
  if (!button) throw new Error(`case ${id} has no <button> in the astro-render build`);
  return { id, props, html: button[0], usage: usageSnippet('astro', props, contract) };
});

// Counted against the contract, not against astroCases: losing the disabled cases must fail here.
const expected = contract.props.variant.values.length * 2;
if (cases.length !== expected) {
  throw new Error(`expected ${expected} Astro cases (each variant, normal and disabled), got ${cases.length}`);
}

mkdirSync(new URL('generated/', gallery), { recursive: true });
writeFileSync(new URL('generated/astro-button.json', gallery), `${JSON.stringify(cases, null, 2)}\n`);
console.log(`gallery/generated/astro-button.json: ${cases.length} cases`);
