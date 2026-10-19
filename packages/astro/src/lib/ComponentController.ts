export class ComponentController {
    DEBUG = false; // Cambiar a true para ver logs de debug
    constructor(container: HTMLElement) {
        this.container = container;
    }
    public container: HTMLElement;
    init() {
    }
    getElement<T extends HTMLElement>(selector: string): T | null {
        return this.container?.querySelector(selector) as T;
    }
    getElements<T extends HTMLElement>(selector: string): NodeListOf<T> {
        return this.container?.querySelectorAll(selector) as NodeListOf<T>;
    }
    emmit<T>(event: string, detail: T) {
        this.container.dispatchEvent(new CustomEvent(event, {
            bubbles: true,
            ...detail,
        }));
    }
    debug(mode: 'log' | 'warn' | 'error', ...args: any[]) {
        if (!this.DEBUG) return;
        if (mode === 'log') console.log(...args);
        else if (mode === 'warn') console.warn(...args);
        else if (mode === 'error') console.error(...args);
    }
    trigger(target: HTMLElement, event: string, detail: Record<string, any> = {}) {
        target.dispatchEvent(new CustomEvent(event, {
            bubbles: true,
            ...detail,
        }));
    }
}