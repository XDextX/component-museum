import type { Meta, StoryObj } from '@storybook/react-vite';
// By specifier, exactly as an outside project imports it (constitution, rule 1; spec 004, RF-10).
import { Button } from '@component-museum/react';
import '@component-museum/react/styles.css';
import contractJson from '../../contracts/button.contract.json';
import { argTypesFromContract, usageSnippet, type Contract } from '../lib/contract-args.ts';

const contract = contractJson as Contract;

/** The example class and its CSS, shown beside the class control (RF-9). Not layered, like a consumer's own rule. */
const exampleClasses = {
  'my-button': '.my-button {\n  border-radius: 999px;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n}',
};

const meta = {
  title: 'Button/React',
  component: Button,
  // Contract-derived controls, never hand-written: a new variant shows up here without an edit.
  argTypes: argTypesFromContract(contract, exampleClasses),
  args: { children: 'Button', className: '' },
  decorators: [
    (Story) => (
      <>
        <style>{Object.values(exampleClasses).join('\n')}</style>
        <Story />
      </>
    ),
  ],
  parameters: {
    docs: {
      source: { transform: (_code: string, ctx: { args: Record<string, unknown> }) => usageSnippet('react', ctx.args, contract) },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
