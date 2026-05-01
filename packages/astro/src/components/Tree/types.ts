export interface TreeItem {
	label: string;
	href?: string;
	children?: TreeItem[];
	expanded?: boolean;
}
