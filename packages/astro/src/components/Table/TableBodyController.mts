import { ComponentController } from "../../lib/ComponentController";
import { EVENTS } from "../../lib/events";
import type { Column } from "./types";

export class TableBodyController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        this.DEBUG = false;
        this.init();
    }
    init() {
        this.container.addEventListener(EVENTS.MUSEUM.TABLE.BODY, (e) => {
            const event = e as CustomEvent<Record<string, any>[]>;
            const columnsStr = this.container.getAttribute('data-table-columns') || '';
            const columns = JSON.parse(columnsStr);
            const data = event.detail;
            this.render(columns, data);
        });
    }
    render(columns: Column[], data: Record<string, any>[]) {
        this.container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (data.length === 0) {
            fragment.appendChild(this.emptyContent(columns));
        } else {
            for (const row of data) {
                const tr = document.createElement('tr');
                for (const { key } of columns) {
                    const td = document.createElement('td');
                    td.className = 'table-td';
                    td.textContent = row[key] || '';
                    tr.appendChild(td);
                }
                fragment.appendChild(tr);
            }
        }
        this.container.appendChild(fragment);
    }

    private emptyContent(columns: any) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.setAttribute('colspan', String(columns.length));
        emptyCell.className = 'table-empty';
        emptyCell.textContent = 'No data available';
        emptyRow.appendChild(emptyCell);
        return emptyRow;
    }
}
