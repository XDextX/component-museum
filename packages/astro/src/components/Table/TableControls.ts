import { ComponentController } from "../../lib/ComponentController";
import EVENTS, { type InputDetail, type MultiselectDetail, type ControllsDetail } from "../../lib/events";

export class ControlsController extends ComponentController {

    constructor(container: HTMLElement) {
        super(container);
        this.DEBUG = false;
        this.searchInput = this.getElement<HTMLInputElement>(`[data-table-search]`);
        this.clearBtn = this.getElement<HTMLButtonElement>(`[data-table-clear]`);
        this.filterSelects = this.getElements<HTMLElement>(`[data-table-filter]`).entries().toArray().map(([index, select]) => select);
        this.tableFilters = this.getElement<HTMLElement>(`[data-table-filters]`);
        this.topControls = this.getElement<HTMLElement>(`[data-table-controls-top]`);
        this.init();
    }

    private searchInput: HTMLInputElement | null;
    private clearBtn: HTMLButtonElement | null;
    private tableFilters: HTMLElement | null;
    private filterSelects: HTMLElement[] = [];
    private topControls: HTMLElement | null;
    private columnsFilter: [key: string, value: string[]][] = [];


    init() {

        this.clearBtn?.addEventListener('click', () => {
            this.clearFilters();
        });
        this.topControls?.addEventListener(EVENTS.MUSEUM.INPUT.INPUT, (e) => {
            const detail = (e as CustomEvent<InputDetail>).detail;
            this.debounce((detail: InputDetail) => {
                this.senseSearchInput(detail);
            }, 300)(detail);
        })
        this.tableFilters?.addEventListener(EVENTS.MUSEUM.MULTISELECT.CHANGE, this.senseColumnsFilterHandler.bind(this));

    }
    senseColumnsFilterHandler(e: Event) {

        const detail = (e as CustomEvent<MultiselectDetail>).detail;

        const column = (e.target as HTMLElement).getAttribute('data-column')!;
        if (this.columnsFilter.find(([col]) => col === column)) {
            this.columnsFilter = this.columnsFilter.filter(([col]) => col !== column);
        }
        if (detail.value.length !== 0) {
            this.columnsFilter.push([column, detail.value]);
        }

        this.emmit<{ detail: ControllsDetail }>(EVENTS.MUSEUM.TABLE.FILTER_CHANGE, {
            detail: {
                inputId: this.searchInput?.getAttribute('data-input-id') || '',
                value: this.searchInput?.value || '',
                columns: this.columnsFilter,
            },
        });

    };

    clearFilters() {
        this.filterSelects.forEach((select) => {
            this.trigger(select, EVENTS.MUSEUM.MULTISELECT.CLEAR);
        });
        this.trigger(this.searchInput!, EVENTS.MUSEUM.INPUT.CLEAR);
    }

    private senseSearchInput(detail: InputDetail) {
        this.emmit<{ detail: ControllsDetail }>(EVENTS.MUSEUM.TABLE.FILTER_CHANGE, {
            detail: {
                inputId: detail.inputId,
                value: detail.value,
                columns: this.columnsFilter,
            },
        });
    }

    debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
        let timeoutId: number;

        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);

            timeoutId = window.setTimeout(() => {
                fn(...args);
            }, delay);
        };
    }
}
