export class Mixin {
    constructor(host) {
        const originalMethods = {};
        const overriddenMethods = this._getOverriddenMethods(this, originalMethods);

        for (const key of Object.keys(overriddenMethods)) {
            if (typeof overriddenMethods[key] === 'function') {
                originalMethods[key] = host[key];
                host[key] = overriddenMethods[key];
            }
        }
    }

    _getOverriddenMethods() {
        throw new Error('Not implemented');
    }
}

Mixin.install = function (host, Ctor, opts) {
    if (!host.__mixins) {
        host.__mixins = [];
    }

    const installedMixin = host.__mixins.find((mixin) => mixin.constructor === Ctor);

    if (installedMixin) {
        return installedMixin;
    }

    const mixin = new Ctor(host, opts);

    host.__mixins.push(mixin);

    return mixin;
};
