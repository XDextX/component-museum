export interface Column {
	key: string;
	label: string;
	sortable?: boolean;
	filterable?: boolean;
	width?: string;
}

export interface TableState {
	sortBy: string | null;
	sortDir: 'asc' | 'desc';
	currentPage: number;
	pageSize: number;
	searchQuery: string;
	filters: Record<string, string[]>;
}