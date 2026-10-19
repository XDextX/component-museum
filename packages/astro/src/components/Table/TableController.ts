import { ComponentController } from "../../lib/ComponentController";
import EVENTS, { type ControllsDetail, type HeaderDetail } from "../../lib/events";
import { queryRows } from "./tableQuery";

export class TableController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        this.tableId = container.getAttribute('data-table-id');
        this.data = JSON.parse(this.container.getAttribute('data-data') || '[]');
        this.pageSize = Number(this.container.getAttribute('data-page-size'));
        this.tBody = this.getElement('[data-table-body]')!;
        container.removeAttribute('data-data');
        this.rows = this.data;
        this.init();
    }

    private tBody: HTMLElement;
    private tableId: string | null;
    private data: Record<string, any>[];
    private pageSize: number;
    private currentPage: number = 1;
    private search = '';
    private columns: ControllsDetail['columns'] = [];
    private sort: HeaderDetail['sort'] = new Map();
    private rows: Record<string, any>[] = [];

    init() {
        this.container.addEventListener(EVENTS.MUSEUM.TABLE.PAGINATION, (e) => {
            const event = e as CustomEvent<{ action: string, currentPage: number; }>;
            const { action, currentPage } = event.detail;
            this.currentPage = currentPage;
            const page = this.getPage(currentPage);
            this.update(page);
        });
        this.container.addEventListener(EVENTS.MUSEUM.TABLE.FILTER_CHANGE, (e) => {
            const { value, columns } = (e as CustomEvent<ControllsDetail>).detail;
            this.search = value;
            this.columns = columns;
            this.refresh();
        });
        this.container.addEventListener(EVENTS.MUSEUM.TABLE.SORT, (e) => {
            this.sort = (e as CustomEvent<HeaderDetail>).detail.sort;
            this.refresh();
        });
    }
    /** Re-run the query, go back to page 1 and tell the pagination how many pages are left. */
    private refresh() {
        this.rows = queryRows(this.data, { search: this.search, columns: this.columns, sort: this.sort });
        this.currentPage = 1;
        this.update(this.getPage(1));
        const pagination = this.getElement('[data-table-pagination]');
        if (pagination) {
            this.trigger(pagination, EVENTS.MUSEUM.TABLE.STATE_UPDATE, {
                detail: { currentPage: 1, totalPages: Math.max(1, Math.ceil(this.rows.length / this.pageSize)) },
            });
        }
    }
    update(data: Record<string, any>[]) {
        this.trigger(this.tBody, EVENTS.MUSEUM.TABLE.BODY, { detail: data });
    }
    private getPage(page: number) {
        const start = (page - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.rows.slice(start, end);
    }
}
