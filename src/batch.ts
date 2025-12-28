import { calculateOptimalBatch } from '/hacker';
import { NS } from '@ns';
import { getAvailableThreads, getRam } from '/lib/servers';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.tprint('');
    const target = 'phantasy';
    // const host = 'voz-drone-25';
    const host = 'CSEC';
    const [ availableRam, maxRam ] = getRam(ns, host);
    const threadsAvailable = getAvailableThreads(ns, host, 1.85);
    const batch = calculateOptimalBatch(ns, target, threadsAvailable);
    ns.tprint(`${host} has ${threadsAvailable} threads available.`);
    ns.tprint(`Batch: ${JSON.stringify(batch)}.`);
}