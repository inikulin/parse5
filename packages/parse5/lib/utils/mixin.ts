export abstract class Mixin<Host> {
    constructor(host: Host) {
        const originalMethods = {} as Host;
        const overriddenMethods = this._getOverriddenMethods(this, originalMethods);

        for (const key of Object.keys(overriddenMethods) as (keyof Host)[]) {
            if (typeof host[key] === 'function') {
                originalMethods[key] = host[key];
                host[key] = overriddenMethods[key]!;
            }
        }
    }

    protected abstract _getOverriddenMethods(mixin: Mixin<Host>, originalMethods: Host): Partial<Host>;

    static install<T, Args extends any[] = [], Mix extends Mixin<T> = Mixin<T>>(
        host: T,
        Ctor: new (host: T, ...args: Args) => Mix,
        ...args: Args
    ): Mix {
        const mixins: Mixin<T>[] = ((host as any).__mixins ??= []);

        const installedMixin = mixins.find((mixin) => mixin.constructor === Ctor);

        if (installedMixin) {
            return installedMixin as Mix;
        }

        const mixin = new Ctor(host, ...args);

        mixins.push(mixin);

        return mixin;
    }
}
