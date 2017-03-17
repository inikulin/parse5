'use strict';

var Mixin = module.exports = function (host) {
    this.originalMethods = {};

    var overriddenMethods = this._getOverriddenMethods(),
        mixin = this;

    Object.keys(overriddenMethods).forEach(function (key) {
        if (typeof overriddenMethods[key] === 'function') {
            mixin.originalMethods[key] = host[key];
            host[key] = overriddenMethods[key];
        }
    });

};

Mixin.prototype._getOverriddenMethods = function () {
    throw new Error('Not implemented');
};

