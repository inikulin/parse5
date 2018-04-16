'use strict';

var Mixin = module.exports = function (host) {
    var originalMethods = {},
        overriddenMethods = this._getOverriddenMethods(this, originalMethods);

    Object.keys(overriddenMethods).forEach(function (key) {
        if (typeof overriddenMethods[key] === 'function') {
            originalMethods[key] = host[key];
            host[key] = overriddenMethods[key];
        }
    });
};

Mixin.prototype._getOverriddenMethods = function () {
    throw new Error('Not implemented');
};

Mixin.install = function (host, Ctor, opts) {
    if (!host.__mixins)
        host.__mixins = [];

    for (var i = 0; i < host.__mixins.length; i++) {
        if (host.__mixins[i].constructor === Ctor)
            return host.__mixins[i];
    }

    var mixin = new Ctor(host, opts);

    host.__mixins.push(mixin);

    return mixin;
};
