type Constructor<Obj = {}> = new (...args: any[]) => Obj;

export type MappedMethods<Host> = {
    [key in keyof Host]: Host[key];
};

export abstract class Mixin<Host extends Constructor> {
    constructor(host: Host) {
        const originalMethods = {} as MappedMethods<Host>;
        const overriddenMethods = this._getOverriddenMethods(this, originalMethods);

        for (const key of Object.keys(overriddenMethods) as (keyof MappedMethods<Host>)[]) {
            if (typeof host[key] === 'function') {
                originalMethods[key] = host[key];
                host[key] = overriddenMethods[key];
            }
        }
    }

    abstract _getOverriddenMethods(_mixin: Mixin<Host>, _originalMethods: MappedMethods<Host>): MappedMethods<Host>;

    static install(
        host: {},
        Ctor: new (_host: typeof host, opts?: any) => Mixin<Constructor<typeof host>>,
        opts?: any
    ) {
        const mixins: Mixin<Constructor<typeof host>>[] = ((host as any).__mixins ??= []);

        const installedMixin = mixins.find((mixin) => mixin.constructor === Ctor);

        if (installedMixin) {
            return installedMixin;
        }

        const mixin = new Ctor(host, opts);

        mixins.push(mixin);

        return mixin;
    }
}
