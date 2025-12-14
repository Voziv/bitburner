import { BasicHGWOptions, NS } from '@ns';
import { ServerList } from '/lib/ServerList';


let CURRENT_MODE = 'weaken';


interface Batch {
    hackDelay: number;
    hackThreads: number;
    growDelay: number;
    growThreads: number;
    weakenDelay: number;
    weakenThreads: number;
}

function calculateBatch(ns: NS, target: string) {
    const hackThreads = ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * 0.75)
    const weakenTime = ns.getWeakenTime(target);
    const growTime = ns.getGrowTime(target);
    const hackTime = ns.getHackTime(target);
    const threads = Math.floor((ns.getServerMaxRam(target) - ns.getServerUsedRam(target)) / 1.85);
    return {
        hackDelay: hackTime - weakenTime,
        hackThreads: threads,
        growDelay: growTime - hackTime,
    }
}

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    const target = 'n00dles';

    // Check to see if the servers security level is at the minimum
    if (ns.getServerSecurityLevel(target) >= ns.getServerMinSecurityLevel(target)) {
        CURRENT_MODE = 'weaken';
    } else {
        CURRENT_MODE = 'hack';
    }
}