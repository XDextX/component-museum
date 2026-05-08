export class TableStateManager {
	columns: any[];
	data: Record<string, any>[];
	state: any;
	pageSize: number;
	sortable: boolean;
	paginated: boolean;
	filteredData: Record<string, any>[];
	onStateChange: (detail: any) => void;

	constructor(
		cols: any[],
		dat: Record<string, any>[],
		opts: { state: any; pageSize: number; sortable: boolean; paginated: boolean },
		onStateChange: (detail: any) => void,
	) {
		this.columns = cols;
		this.data = dat;
		this.state = opts.state;
		this.pageSize = opts.pageSize;
		this.sortable = opts.sortable;
		this.paginated = opts.paginated;
		this.filteredData = this.data;
		this.onStateChange = onStateChange;
	}

	setState(updates: Record<string, any>) {
		Object.assign(this.state, updates);
		this.onStateChange({
			state: this.state,
			filteredData: this.filteredData,
			totalPages: Math.ceil(this.filteredData.length / this.pageSize),
		});
	}

	applyFiltersAndSort() {
		const SORT_DIR = { ASC: 'asc', DESC: 'desc' };
		const hasSearchQuery = this.state.searchQuery.length > 0;
		const hasFilters = Object.keys(this.state.filters).length > 0;

		let filtered = this.data;
		if (hasSearchQuery || hasFilters) {
			filtered = this.data.filter((row) => {
				if (hasSearchQuery) {
					const matchesSearch = this.columns.some((col) =>
						String(row[col.key] || '')
							.toLowerCase()
							.includes(this.state.searchQuery),
					);
					if (!matchesSearch) return false;
				}
				if (hasFilters) {
					const matchesFilters = Object.entries(this.state.filters).every(
						([col, vals]: [string, any]) => vals.includes(String(row[col] || '')),
					);
					if (!matchesFilters) return false;
				}
				return true;
			});
		}

		if (this.sortable && this.state.sortBy) {
			filtered.sort((a, b) => {
				const aVal = a[this.state.sortBy];
				const bVal = b[this.state.sortBy];
				if (aVal < bVal) return this.state.sortDir === SORT_DIR.ASC ? -1 : 1;
				if (aVal > bVal) return this.state.sortDir === SORT_DIR.ASC ? 1 : -1;
				return 0;
			});
		}

		this.filteredData = filtered;
	}
}
