import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.tprint('');

    for (let cores = 1; cores <= 10; cores++) {
        ns.tprint(`Weaken amounts at ${cores} CPU cores.`);
        for (let i = 0; i < 10; i++) {
            ns.tprint(`${i.toString().padStart(2)}: ${ns.weakenAnalyze(i, cores)}`);
        }
    }
}