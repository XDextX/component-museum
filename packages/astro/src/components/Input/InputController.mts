import { ComponentController } from "../../lib/ComponentController";
import EVENTS, { type InputDetail } from "../../lib/events";

export class InputController extends ComponentController {
    constructor(input: HTMLInputElement) {
        super(input);
        this.input = this.container as HTMLInputElement;
        this.inputId = input.getAttribute('data-input-id');
        this.DEBUG = true;
        this.init();
    }
    private input: HTMLInputElement;
    private inputId: string | null;
    init() {
        this.container.addEventListener('input', () => {
            this.senseInput();
        });
        this.container.addEventListener(EVENTS.MUSEUM.INPUT.CLEAR, () => {
            this.input.value = '';
            this.senseInput();
        });
        this.container.addEventListener(EVENTS.MUSEUM.INPUT.CHANGE, (e) => {
            this.input.value = (e as CustomEvent<InputDetail>).detail.value;
            this.senseInput();
        });
    }

    private senseInput() {
        this.emmit<{ detail: InputDetail }>(EVENTS.MUSEUM.INPUT.INPUT, {
            detail: {
                inputId: this.inputId!,
                value: this.input.value,
            },
        });
    }
}
