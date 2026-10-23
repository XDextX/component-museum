import type { Meta, StoryObj } from '@storybook/react-vite';
// By specifier, exactly as an outside project imports it (constitution, rule 1; spec 004, RF-10).
import { Input } from '@component-museum/react';
import '@component-museum/react/styles.css';
import contractJson from '../../contracts/input.contract.json';
import { argTypesFromContract, usageSnippet, type Contract } from '../lib/contract-args.ts';

const contract = contractJson as Contract;

/** The example class shown beside the class control; the documentation page imports it too. */
export const exampleInputClasses: Record<string, string> = {
  'my-input': '.my-input {\n  border-radius: 999px;\n  letter-spacing: 0.05em;\n}',
};

const meta = {
  title: 'Input/React',
  component: Input,
  // Contract-derived controls, never hand-written: a new prop shows up here without an edit.
  argTypes: argTypesFromContract(contract, exampleInputClasses),
  args: { label: 'Label', className: '' },
  excludeStories: ['exampleInputClasses'],
  decorators: [
    (Story) => (
      <>
        <style>{Object.values(exampleInputClasses).join('\n')}</style>
        <Story />
      </>
    ),
  ],
  parameters: {
    // The expanded panel has the description column, where the class control shows its CSS.
    controls: { expanded: true },
    docs: {
      source: { transform: (_code: string, ctx: { args: Record<string, unknown> }) => usageSnippet('react', ctx.args, contract) },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
