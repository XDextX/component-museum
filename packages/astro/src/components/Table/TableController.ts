import { ComponentController } from "../../lib/ComponentController";
import EVENTS from "../../lib/events";

export class TableController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        this.tableId = container.getAttribute('data-table-id');
        this.data = JSON.parse(this.container.getAttribute('data-data') || '[]');
        this.pageSize = Number(this.container.getAttribute('data-page-size'));
        this.tBody = this.getElement('[data-table-body]')!;
        container.removeAttribute('data-data');
        this.init();
    }

    private tBody: HTMLElement;
    private tableId: string | null;
    private data: Record<string, any>[];
    private pageSize: number;
    private currentPage: number = 1;

    init() {
        this.container.addEventListener(EVENTS.MUSEUM.TABLE.PAGINATION, (e) => {
            const event = e as CustomEvent<{ action: string, currentPage: number; }>;
            const { action, currentPage } = event.detail;
            this.currentPage = currentPage;
            const page = this.getPage(currentPage);
            this.update(page);
        });
    }
    update(data: Record<string, any>[]) {
        this.trigger(this.tBody, EVENTS.MUSEUM.TABLE.BODY, { detail: data });
    }
    private getPage(page: number) {
        const start = (page - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.data.slice(start, end);
    }
}
