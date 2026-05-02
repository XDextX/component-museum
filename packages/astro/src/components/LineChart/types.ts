export interface DataPoint {
	label: string;
	value: number;
}

export interface Dataset {
	label: string;
	data: DataPoint[];
	color?: string;
}
