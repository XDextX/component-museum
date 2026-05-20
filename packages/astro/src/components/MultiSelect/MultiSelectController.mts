import { ComponentController } from "../../lib/ComponentController";
import EVENTS, { type CheckboxDetail } from "../../lib/events";

export class MultiSelectController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        this.container = container
        this.input = this.getElement<HTMLInputElement>(`[data-multiselect-display]`);
        if (!this.input) {
            console.warn('⚠️ No se encontró input para multiselect');
            return;
        }
        this.dropdown = this.getElement(`[data-multiselect-dropdown]`);
        if (!this.dropdown) {
            console.warn('⚠️ No se encontró dropdown para multiselect');
            return;
        }
        this.toggleBtn = this.getElement(`[data-multiselect-toggle]`);
        this.init();
        this.DEBUG = true;
    }
    private input: HTMLInputElement | null = null;
    private dropdown: HTMLElement | null = null;
    private toggleBtn: HTMLButtonElement | null = null;
    private value: string = "";
    private displayValue: string = "";


    init() {

        this.container.addEventListener(EVENTS.MUSEUM.CHECKBOX.CHANGE, (e) => {
            const { detail } = e as CustomEvent<CheckboxDetail>;
            this.updateInput(detail);
            this.updateValue(detail);
        });
        this.container.addEventListener(EVENTS.MUSEUM.MULTISELECT.CLEAR, () => {
            this.value = '';
            this.displayValue = '';
            this.updateInput({ value: '', label: '' });
            this.updateValue({ value: '', label: '' });
        });
        this.input?.addEventListener('click', () => this.toggleDropdown());
        this.toggleBtn?.addEventListener('click', () => this.toggleDropdown());
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        // this.updateInput();
    }
    updateValue(e: Partial<CheckboxDetail>) {
        let value = this.value.split(',').filter((v) => v !== '');
        if (e.checked) {
            value.push(e.label!);
        } else {
            this.debug("log", e)
            value = value.filter((v) => v !== e.label);
        }
        this.value = value.join(',');
        this.emmit(EVENTS.MUSEUM.MULTISELECT.CHANGE, {
            detail: {
                value: this.value.split(',').filter((v) => v !== ''),
                display: this.displayValue,
            },
        });
    }

    toggleDropdown() {
        this.dropdown?.classList.toggle('multiselect-dropdown-open');
        this.toggleBtn?.classList.toggle('multiselect-toggle-open');
    }

    closeDropdown() {
        this.dropdown?.classList.remove('multiselect-dropdown-open');
        this.toggleBtn?.classList.remove('multiselect-toggle-open');
    }

    updateInput(e: Partial<CheckboxDetail>) {
        if (!this.input) return;
        let value = this.input.value.split(',').filter((v) => v !== '');
        if (value) {
            if (e.checked) {
                value.push(e.label!);
            } else {
                this.debug("log", e)
                value = value.filter((v) => v !== e.label);
            }
        }

        this.displayValue = value.join(',');
        this.trigger(this.input, EVENTS.MUSEUM.INPUT.CHANGE, {
            detail: {
                value: this.displayValue,
            },
        });

    }

    handleOutsideClick(e: PointerEvent) {
        if (!this.container?.contains(e.target as Node)) {
            this.closeDropdown();
        }
    }
    getElement<T extends HTMLElement>(selector: string): T | null {
        return this.container?.querySelector(selector) as T;
    }
    getElements<T extends HTMLElement>(selector: string): NodeListOf<T> {
        return this.container?.querySelectorAll(selector) as NodeListOf<T>;
    }
}
