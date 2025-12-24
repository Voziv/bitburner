import { BasicHGWOptions, NS } from '@ns';


const ACTIONS = [
    'grow',
    'weaken',
    'hack',
    'grow-loop',
    'weaken-loop',
    'hack-loop',
];

export async function main(ns: NS): Promise<void> {
    const action = ns.args[0].toString();
    const target = ns.args[1].toString();
    const additionalMsec = ns.args[2] as number ?? 0;

    if (!action || !ACTIONS.includes(action)) {
        ns.print(`Action must be one of [${ACTIONS.join(',')}]`);
        ns.exit();
    }

    if (!target) {
        ns.print(`You must specify a target as the first parameter`);
        ns.exit();
    }

    const opts: BasicHGWOptions = {};
    if (additionalMsec > 0) opts.additionalMsec = additionalMsec;

    // ns.write(`hack.txt`, `Starting with args: ${JSON.stringify(ns.args)}\n`, 'a');
    switch (action) {
        case 'grow': {
            await ns.grow(target, opts);
            break;
        }
        case 'hack':
            await ns.hack(target, opts);
            break;
        case 'weaken':
            await ns.weaken(target, opts);
            break;
        case 'grow-loop':
            while (true) {
                await ns.grow(target, opts);
            }
        case 'hack-loop':
            while (true) {
                await ns.hack(target, opts);
            }
        case 'weaken-loop': {
            while (true) {
                await ns.weaken(target, opts);
            }
        }
    }
    // ns.write(`hack.txt`, `Finished with args: ${JSON.stringify(ns.args)}\n`, 'a');
}