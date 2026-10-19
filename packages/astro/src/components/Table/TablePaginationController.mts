import { ComponentController } from '../../lib/ComponentController';
import { EVENTS } from '../../lib/events';
export const PAGINATION_ACTION = { PREV: 'prev', NEXT: 'next' };

export class TablePaginationController extends ComponentController {
    constructor(container: HTMLElement) {
        super(container);
        this.prevBtn = this.getElement('[data-action="prev"]')!;
        this.nextBtn = this.getElement('[data-action="next"]')!;
        this.currentPageSpan = this.getElement('[data-table-current-page]')!;
        this.totalPagesSpan = this.getElement('[data-table-total-pages]')!;
        this.currentPage = Number(this.container.getAttribute('data-current-page'));
        this.totalPages = Number(this.container.getAttribute('data-total-pages'));
        this.enableActions();

        this.init();

    }
    private currentPage: number = 1;
    private totalPages: number = 1;

    private prevBtn: HTMLElement;
    private nextBtn: HTMLElement;
    private currentPageSpan: HTMLElement;
    private totalPagesSpan: HTMLElement;

    private enableActions() {
        this.setButtonState(this.nextBtn, this.currentPage === this.totalPages);
        this.setButtonState(this.prevBtn, this.currentPage === 1);
    }
    private setButtonState(btn: HTMLElement, disabled: Boolean) {
        if (disabled) {
            btn.setAttribute('disabled', String(true));
            btn.setAttribute('aria-disabled', String(true));
        } else {
            btn.removeAttribute('disabled');
            btn.removeAttribute('aria-disabled');
        };

    }

    init() {
        this.prevBtn?.addEventListener('click', () => {
            this.update(PAGINATION_ACTION.PREV);
        });
        this.nextBtn?.addEventListener('click', () => {
            this.update(PAGINATION_ACTION.NEXT);
        });
    }
    update(action: string) {
        if (action === PAGINATION_ACTION.PREV && this.currentPage > 1) {
            this.currentPage--;
            this.notify(action);
        }

        if (action === PAGINATION_ACTION.NEXT && this.currentPage < this.totalPages) {
            this.currentPage++;
            this.notify(action);
        }

        this.enableActions()
        this.currentPageSpan.textContent = String(this.currentPage);
        this.totalPagesSpan.textContent = String(this.totalPages);
    }

    private notify(action: string) {
        this.emmit<{ detail: { action: string; currentPage: number; } }>(EVENTS.MUSEUM.TABLE.PAGINATION, {
            detail: {
                action: action,
                currentPage: this.currentPage,
            },
        });
    }
}
