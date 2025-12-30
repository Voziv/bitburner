import { NS } from '@ns';
import { tPrintStats } from '/lib/format';
import { calculateOptimalBatch } from '/lib/hacking';

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.ui.clearTerminal();
    const target = ns.args[0] as string;

    const player = ns.getPlayer();

    const server = ns.getServer(target);
    const serverBase = ns.getServer(target);
    serverBase.hackDifficulty = server.baseDifficulty;
    serverBase.moneyAvailable = (server.moneyMax ?? 1) / 4;
    const serverPerfect = ns.getServer(target);
    serverPerfect.hackDifficulty = server.minDifficulty;
    serverPerfect.moneyAvailable = server.moneyMax;

    const data = new Map<string, any>();
    // const threadsAvailable = 90729; // Would normally be calculated
    const threadsAvailable = 1000; // Would normally be calculated

    const batch = calculateOptimalBatch(ns, target, threadsAvailable);

    data.set('Host', server.hostname);
    data.set('Total Threads', threadsAvailable);
    data.set('Batch H / HW / G / GW / Total', `${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`);
    data.set('Max Batch Instances', `${Math.floor(threadsAvailable / batch.totalThreads)}`);
    tPrintStats(ns, data);
}