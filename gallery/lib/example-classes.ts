/**
 * The example classes the gallery defines and shows beside each component's class control (spec 004,
 * RF-9), by component name, then by class name. The only copy: each React story and documentation
 * page import it.
 */
export const exampleClasses: Record<string, Record<string, string>> = {
  Button: {
    'my-button': '.my-button {\n  border-radius: 999px;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n}',
  },
  Input: {
    'my-input': '.my-input {\n  border-radius: 999px;\n  letter-spacing: 0.05em;\n}',
  },
  Textarea: {
    'my-textarea': '.my-textarea {\n  border-radius: 0.25rem;\n  letter-spacing: 0.05em;\n}',
  },
};
