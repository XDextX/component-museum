import { ComponentController } from '../../lib/ComponentController';
import { EVENTS, SORT_ICON, type HeaderDetail } from '../../lib/events';


export class TableHeaderController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        this.sortIcons = this.getElements<HTMLElement>(`[data-table-sort-icon]`)
            .entries()
            .toArray()
            .map(([index, icon]) => icon);
        this.init();
    }


    private sortIcons: HTMLElement[] = [];
    private columnsSort: Map<string, keyof typeof SORT_ICON> = new Map();
    private nextSort: Record<keyof typeof SORT_ICON, keyof typeof SORT_ICON> = {
        UP: 'DOWN',
        DOWN: 'DEFAULT',
        DEFAULT: 'UP',
    };

    init() {
        this.sortIcons.forEach((icon) => {
            const th = icon.closest('th');
            if (!th) {
                return;
            }
            const sortable = Boolean(th.getAttribute('data-table-sortable'));
            if (!sortable) {
                icon.classList.remove('active');
                return;
            }

            icon.classList.add('active');

            const column = th.getAttribute('data-column')!;
            this.columnsSort.set(column, 'DEFAULT');

            th.addEventListener('click', (e) => {
                const th = e.currentTarget as HTMLElement;
                const sortable = Boolean(th.getAttribute('data-table-sortable'));
                if (!sortable) return;

                const sort = this.columnsSort.get(column) || 'DEFAULT';
                const newSort = this.nextSort[sort];
                this.columnsSort.set(column, newSort);
                icon.textContent = SORT_ICON[newSort];
                this.emmit<{ detail: HeaderDetail }>(EVENTS.MUSEUM.TABLE.SORT, {
                    detail: {
                        sort: this.columnsSort,
                    },
                });

            });
        });
    }
}
