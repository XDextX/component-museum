export interface ValidationRule {
	type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern';
	value?: string | number;
	message: string;
}

export interface FieldValidation {
	[fieldName: string]: ValidationRule[];
}
