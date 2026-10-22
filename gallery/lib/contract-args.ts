// Dependency-free on purpose: the Storybook stories, the Astro extractor and the tests share it.

type PropSpec =
  | { type: 'enum'; values: string[]; default: string }
  | { type: 'boolean'; default: boolean };

/** The part of a component contract this module reads (structurally the repo's `Contract`). */
export type Contract = {
  name: string;
  props: Record<string, PropSpec>;
  events: string[];
  content: boolean;
  classProp: boolean;
};

export type ArgType = {
  control: { type: 'select' | 'boolean' | 'text'; labels?: Record<string, string> };
  options?: string[];
  description?: string;
};
export type ArgTypes = Record<string, ArgType>;

type Framework = 'react' | 'astro';

/**
 * One control per contract prop that is not an event: closed list for enums, switch for booleans,
 * text for the content, and the class as a closed list of "none" plus the example classes.
 * @param exampleClasses example class name to the CSS shown beside the control.
 * @returns Storybook `argTypes`, keyed by React prop name (`className`, `children`).
 */
export function argTypesFromContract(contract: Contract, exampleClasses: Record<string, string>): ArgTypes {
  const types: ArgTypes = {};
  for (const [name, spec] of Object.entries(contract.props)) {
    types[name] =
      spec.type === 'enum'
        ? { control: { type: 'select' }, options: spec.values }
        : { control: { type: 'boolean' } };
  }
  if (contract.content) types.children = { control: { type: 'text' } };
  if (contract.classProp) {
    types.className = {
      control: { type: 'select', labels: { '': 'none' } },
      options: ['', ...Object.keys(exampleClasses)],
      description: Object.values(exampleClasses).map((css) => '```css\n' + css + '\n```').join('\n'),
    };
  }
  return types;
}

/**
 * The usage code of one state: both imports, then the markup with only the props off their default.
 * @param args React-style args (`className`, `children`); events never appear.
 * @returns the snippet; Astro writes `class`, React `className`.
 */
export function usageSnippet(framework: Framework, args: Record<string, unknown>, contract: Contract): string {
  const pkg = `@component-museum/${framework}`;
  const attrs: string[] = [];
  for (const [name, spec] of Object.entries(contract.props)) {
    const value = args[name];
    if (value === undefined || value === spec.default) continue;
    attrs.push(spec.type === 'boolean' ? name : `${name}="${value}"`);
  }
  const cls = args.className;
  if (contract.classProp && typeof cls === 'string' && cls !== '') {
    attrs.push(`${framework === 'astro' ? 'class' : 'className'}="${cls}"`);
  }
  const open = [contract.name, ...attrs].join(' ');
  const text = contract.content && typeof args.children === 'string' ? args.children : '';
  const markup = text === '' ? `<${open} />` : `<${open}>${text}</${contract.name}>`;
  return `import { ${contract.name} } from '${pkg}';\nimport '${pkg}/styles.css';\n\n${markup}`;
}

/**
 * The Astro states to prerender: every `variant` value, normal then disabled.
 * @returns cases with an id (`primary`, `primary-disabled`) and the props to render.
 */
export function astroCases(contract: Contract): { id: string; props: Record<string, unknown> }[] {
  const variant = contract.props.variant;
  if (variant?.type !== 'enum') return [];
  return variant.values.flatMap((v) =>
    [false, true].map((disabled) => ({
      id: disabled ? `${v}-disabled` : v,
      props: { variant: v, disabled, children: contract.name },
    })),
  );
}
