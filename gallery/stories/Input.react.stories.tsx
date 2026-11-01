import type { Meta, StoryObj } from '@storybook/react-vite';
// By specifier, exactly as an outside project imports it (constitution, rule 1; spec 004, RF-10).
import { Input } from '@component-museum/react';
import '@component-museum/react/styles.css';
import contractJson from '../../contracts/input.contract.json';
import { argTypesFromContract, usageSnippet, type Contract } from '../lib/contract-args.ts';
// The example class and its CSS, shown beside the class control (RF-9). Not layered, like a consumer's own rule.
import { exampleClasses } from '../lib/example-classes.ts';

const contract = contractJson as Contract;

const meta = {
  title: 'Input/React',
  component: Input,
  // Contract-derived controls, never hand-written: a new prop shows up here without an edit.
  argTypes: argTypesFromContract(contract, exampleClasses.Input),
  // Not the generic example text (`Label`): the gallery test sets that one and needs a default without it.
  args: { label: 'Email', className: '' },
  decorators: [
    (Story) => (
      <>
        <style>{Object.values(exampleClasses.Input).join('\n')}</style>
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
