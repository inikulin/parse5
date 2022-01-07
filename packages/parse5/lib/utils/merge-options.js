export function mergeOptions(defaults, options) {
    options = options || Object.create(null);

    return [defaults, options].reduce((merged, optObj) => {
        for (const key of Object.keys(optObj)) {
            merged[key] = optObj[key];
        }

        return merged;
    }, Object.create(null));
}
