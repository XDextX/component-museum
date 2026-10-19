import { ComponentController } from "../../lib/ComponentController";
import EVENTS, { type CheckboxDetail } from "../../lib/events";

export class MultiSelectController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        const input = this.getElement<HTMLInputElement>(`[data-multiselect-display]`);
        if (!input) {
            console.warn('⚠️ No se encontró input para multiselect');
            return;
        }
        const dropdown = this.getElement(`[data-multiselect-dropdown]`);
        if (!dropdown) {
            console.warn('⚠️ No se encontró dropdown para multiselect');
            return;
        }
        this.input = input;
        this.dropdown = dropdown;
        this.toggleBtn = this.getElement(`[data-multiselect-toggle]`);
        this.clearBtn = this.getElement(`[data-multiselect-clear]`);
        this.options = this.getElements<HTMLInputElement>(`[data-multiselect-checkbox]`)
            .entries()
            .toArray()
            .map(([index, checkbox]) => checkbox);
        this.init();
        this.DEBUG = false;
    }
    private input: HTMLInputElement | null = null;
    private dropdown: HTMLElement | null = null;
    private toggleBtn: HTMLButtonElement | null = null;
    private clearBtn: HTMLButtonElement | null = null;
    private value: string = "";
    private displayValue: string = "";
    private options: HTMLInputElement[] = [];


    init() {

        this.container.addEventListener(EVENTS.MUSEUM.CHECKBOX.CHANGE, (e) => {
            const { detail } = e as CustomEvent<CheckboxDetail>;
            this.updateValue(detail);
        });
        this.container.addEventListener(EVENTS.MUSEUM.MULTISELECT.CLEAR, () => {
            this.clear();
        });
        this.input?.addEventListener('click', () => this.toggleDropdown());
        this.toggleBtn?.addEventListener('click', () => this.toggleDropdown());
        this.clearBtn?.addEventListener('click', () => this.clear());
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }
    private clear() {
        this.options.forEach((option) => {
            this.trigger(option, EVENTS.MUSEUM.CHECKBOX.CLEAR);
        });
        this.value = '';
        this.displayValue = '';
        this.updateValue({ value: '', label: '' });
    }

    private updateValue(e: Partial<CheckboxDetail>) {
        let value = this.value.split(',').filter((v) => v !== '');
        if (e.checked) {
            value.push(e.label!);
        } else {
            value = value.filter((v) => v !== e.label);
        }
        this.value = value.join(',');
        this.displayValue = value.join(',');
        // The display input shows the selection; the Input controller sets its value.
        if (this.input) this.trigger(this.input, EVENTS.MUSEUM.INPUT.CHANGE, { detail: { value: this.displayValue } });
        this.emmit(EVENTS.MUSEUM.MULTISELECT.CHANGE, {
            detail: {
                value: value,
                display: this.displayValue,
            },
        });
    }
    private toggleDropdown() {
        this.dropdown?.classList.toggle('multiselect-dropdown-open');
        this.toggleBtn?.classList.toggle('multiselect-toggle-open');
    }

    private closeDropdown() {
        this.dropdown?.classList.remove('multiselect-dropdown-open');
        this.toggleBtn?.classList.remove('multiselect-toggle-open');
    }


    private handleOutsideClick(e: PointerEvent) {
        if (!this.container?.contains(e.target as Node)) {
            this.closeDropdown();
        }
    }
}
