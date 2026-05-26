export class PerspectiveSelectDetail {
    constructor(selected, row, column_names, removeConfigs, insertConfigs) {
        this.selected = selected;
        this.row = row;
        this.column_names = column_names;
        this.removeConfigs = removeConfigs;
        this.insertConfigs = insertConfigs;
    }

    get removeFilters() {
        return this.removeConfigs.flatMap((config) => config.filter ?? []);
    }

    get insertFilters() {
        return this.insertConfigs.flatMap((config) => config.filter ?? []);
    }
}
