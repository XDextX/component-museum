export const EVENTS = {
    MUSEUM: {
        INPUT: {
            INPUT: 'museum:input:input',
            CLEAR: 'museum:input:clear',
            CHANGE: 'museum:input:change',
        },
        CHECKBOX: {
            CHANGE: 'museum:checkbox:change',
            CLEAR: 'museum:checkbox:clear',
        },
        MULTISELECT: {
            CHANGE: 'museum:multiselect:change',
            CLEAR: 'museum:multiselect:clear',
        },
    },
} as const;
export interface Events {
    [key: string]: {
        [key: string]: string;
    };
}
export interface CheckboxDetail {
    checkboxId: string;
    checked: boolean;
    value: string;
    label: string;
}
export interface InputDetail {
    inputId: string;
    value: string;
}
export interface MultiselectDetail {
    value: string;
}
export default EVENTS;