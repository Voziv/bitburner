import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.tprint('');

    for (let cores = 1; cores <= 10; cores++) {
        ns.tprint(`Weaken amounts at ${cores} CPU cores.`);
        for (let i = 0; i < 10; i++) {
            ns.tprint(`${i.toString().padStart(2)}: ${calculateWeakenAmount(ns, i, cores)}`);
        }
    }
}

function calculateWeakenAmount(ns: NS, threads: number, cores = 1): number {
    // Grabbed it from the source code to avoid ram penalties :D
    // const coreBonus = getCoreBonus(cores);
    // return ServerConstants.ServerWeakenAmount * threads * coreBonus * currentNodeMults.ServerWeakenRate;
    // ServerConstants.ServerWeakenAmount = 0.05
    // currentNodeMults.ServerWeakenRate -- Tied to a future bitnode as I
    const coreBonus = 1 + (cores - 1) / 16;
    return 0.05 * threads * coreBonus * ns.getBitNodeMultipliers().ServerWeakenRate;
}