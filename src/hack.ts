import { BasicHGWOptions, NS } from '@ns';


enum Action {
    Hack = 'hack',
    Grow = 'grow',
    Weaken = 'weaken',
}

export async function main(ns: NS): Promise<void> {
    const action = ns.args[0] as Action;
    const target = ns.args[1] as string;
    const additionalMsec = ns.args[2] as number ?? 0;

    if (!action || !Object.values(Action).includes(action)) {
        ns.print(`Action must be one of [${Object.values(Action).join(',')}]`);
        ns.exit();
    }

    if (!target) {
        ns.print(`You must specify a target as the first parameter`);
        ns.exit();
    }

    const opts: BasicHGWOptions = {};
    if (additionalMsec > 0) opts.additionalMsec = additionalMsec;

    switch (action) {
        case Action.Hack: {
            await ns.hack(target, opts);
            break;
        }
        case Action.Grow:
            await ns.grow(target, opts);
            break;
        case Action.Weaken:
            await ns.weaken(target, opts);
            break;
    }
}