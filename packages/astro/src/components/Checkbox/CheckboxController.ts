import { ComponentController } from "../../lib/ComponentController";
import EVENTS from "../../lib/events";

export class CheckboxController extends ComponentController {
    constructor(checkbox: HTMLInputElement) {
        super(checkbox);
        this.checkboxId = checkbox.getAttribute('data-checkbox-id');
        this.init();
    }
    private checkboxId: string | null;
    init() {
        const checkbox = this.container as HTMLInputElement;
        this.container.addEventListener('change', () => {
            this.emmit(EVENTS.MUSEUM.CHECKBOX.CHANGE, {
                detail: {
                    checkboxId: this.checkboxId,
                    checked: checkbox.checked,
                    value: checkbox.value,
                    label: checkbox.getAttribute('data-checkbox-label'),
                },
            });
        });
        this.container.addEventListener(EVENTS.MUSEUM.CHECKBOX.CLEAR, () => {
            checkbox.checked = false;
            this.emmit(EVENTS.MUSEUM.CHECKBOX.CHANGE, {
                detail: {
                    checkboxId: this.checkboxId,
                    checked: checkbox.checked,
                },
            });
        });
    }
}