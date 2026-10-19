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
        TABLE: {
            STATE_UPDATE: 'museum:table:state-update',
            CLEAR_ALL: 'museum:table:clear-all',
            CLEAR_FILTER: 'museum:table:clear-filter',
            PAGINATION: 'museum:table:pagination',
            FILTER_CHANGE: 'museum:table:filter-change',
            SORT: 'museum:table:sort',
            BODY: 'museum:table:body',
        },
    },
} as const;
export const SORT_ICON = { UP: '↑', DOWN: '↓', DEFAULT: '↕' } as const;
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
    display: string;
    value: string[];
}
export interface ControllsDetail {
    inputId: string;
    value: string;
    columns: [key: string, value: string[]][];
}
export interface HeaderDetail {
    sort: Map<string, keyof typeof SORT_ICON>;
}
export default EVENTS;