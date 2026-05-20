
const DEBUG = true; // Cambiar a true para ver logs de debug
export class ControlsController {

    constructor(table: HTMLElement) {
        this.table = table;
        this.tableId = table.getAttribute('data-table-id');
        this.searchInput = table.querySelector<HTMLInputElement>('[data-table-search]');
        this.clearBtn = table.querySelector<HTMLButtonElement>('[data-table-clear]');
        this.filterSelects = table.querySelectorAll<HTMLElement>('[data-table-filter]');
        this.filterCliearBtns = table.querySelectorAll<HTMLButtonElement>('[data-table-filter-clear]');
    }

    private tableId: string | null;
    private table: HTMLElement;
    private searchInput: HTMLInputElement | null;
    private clearBtn: HTMLButtonElement | null;
    private filterSelects: NodeListOf<HTMLElement>;
    private filterCliearBtns: NodeListOf<HTMLElement>;

    init() {
        if (!this.table) {
            debug('warn', '⚠️ Contenedor no encontrado para tabla:', this.tableId);
            return;
        }
        this.initSearchInput();
        this.initClearBtn();
        this.initFilterClearBtns();
        this.initFilterSelects();
    }
    private initClearBtn() {
        if (!this.clearBtn) {
            return;
        }
        this.clearBtn.addEventListener('click', () => {
            debug('log', '🧹 Clear all clicked');
            this.dispatchEvent('table:clear-all');

            if (!this.filterSelects) {
                debug('warn', '⚠️ No se encontraron filtros para tabla:', this.tableId);
            }
            this.filterSelects.forEach((el) => {
                el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
                    if (cb instanceof HTMLInputElement) {
                        cb.checked = false;
                    }
                });
                const input = el.querySelector(
                    '[data-multiselect-display]',
                ) as HTMLInputElement | null;
                if (input) input.value = '';
            });

            this.searchInput && (this.searchInput.value = '');

        });
    }
    private dispatchEvent(event: string, detail: Record<string, any> = {}) {
        this.table.dispatchEvent(new CustomEvent(event, {
            bubbles: true,
            ...detail,
        }));
    }
    private initSearchInput() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', debounce((e: any) => {
                debug('log', '🔍 Search input event:', e.target.value);
                this.dispatchEvent('table:search', {
                    detail: e.target.value,
                });
            }, 300));
        }
    }
    private initFilterClearBtns() {
        if (!this.filterCliearBtns) {
            debug('warn', '⚠️ No se encontraron filtros para tabla:', this.tableId);
            return;
        }
        this.filterCliearBtns.forEach((el) => {
            const column = el.getAttribute('data-column');
            const multiSelect = this.filterSelects.entries().find(([_, el]) => el.getAttribute('data-column') === column);
            if (!multiSelect) {
                debug('warn', '⚠️ No se encontró multiselect para columna:', column);
                return;
            }
            const checkboxes = multiSelect[1].querySelectorAll('input[type="checkbox"]');
            const input = multiSelect[1].querySelector(
                '[data-multiselect-display]',
            ) as HTMLInputElement | null;
            el.addEventListener('click', () => {
                debug('log', '❌ Clear filter clicked para columna:', column);
                checkboxes.forEach((cb) => {
                    if (cb instanceof HTMLInputElement) {
                        cb.checked = false;
                    }
                    if (input) input.value = '';

                });
                this.dispatchEvent('table:clear-filter', {
                    detail: { column },
                });
            })
        });

    }
    private initFilterSelects() {
        if (!this.filterSelects) {
            debug('warn', '⚠️ No se encontraron filtros para tabla:', this.tableId);
            return;
        }
        this.filterSelects.forEach((el) => {
            el.querySelector('[data-multiselect-display]')?.addEventListener('change', () => {
                const column = el.getAttribute('data-column');
                debug('log', 'cambio en columna:', column);
                this.dispatchEvent(
                    'table:filter-change', {
                    detail: { column },
                });
            });
        });
    }
}

export function debug(mode: 'log' | 'warn' | 'error', ...args: any[]) {
    if (!DEBUG) return;
    if (mode === 'log') console.log(args);
    else if (mode === 'warn') console.warn(args);
    else if (mode === 'error') console.error(args);
}
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timeoutId: number;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);

        timeoutId = window.setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
