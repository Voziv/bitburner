import { NS, Player, Server } from '@ns';


export type Batch = {
    hThreads: number;
    hwThreads: number;
    gThreads: number;
    gwThreads: number;
    totalThreads: number;

    hDelay: number;
    hwDelay: number;
    gDelay: number;
    gwDelay: number;
}

export type BatchDelay = {
    hackDelay: number;
    growDelay: number;
}


export function calculateBatchForGrowThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1): number[] {
    const player = ns.getPlayer();
    const server = ns.getServer(target);

    let gThreads = Math.min(Math.ceil(ns.formulas.hacking.growThreads(server, player, server.moneyMax!, cpuCores)), threadsAvailable);
    const growSecurityIncrease = ns.growthAnalyzeSecurity(gThreads, undefined, cpuCores);
    const gwThreads = Math.ceil(growSecurityIncrease / ns.weakenAnalyze(1, cpuCores));
    if ((gThreads + gwThreads) > threadsAvailable) {
        gThreads -= (gThreads + gwThreads) - threadsAvailable;
    }

    if (gThreads < 0) {
        return [];
    }

    if ((gwThreads + gThreads) > threadsAvailable) {
        return [];
    }

    return [ gThreads, gwThreads ];
}

export function calculateBatchForHackThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1, hackPct: number, hThreads: number): [ hThreads: number, hwThreads: number, gThreads: number, gwThreads: number ] | [] {
    const player = ns.getPlayer();
    const server = ns.getServer(target);

    if (hThreads === 0) {
        throw new Error('Error, hThreads must be > 0 to calculate the best batch');
    }

    if (server.hackDifficulty != server.minDifficulty) {
        ns.tprint('ERROR Server was not pre-weakened. WTF dude.');
    }

    server.hackDifficulty = server.minDifficulty;

    const hackAmount = hackPct * hThreads * server.moneyAvailable!;
    server.moneyAvailable = Math.floor(server.moneyMax! - hackAmount);


    /**
     * HW - Weaken to counteract hack() security increase
     */
    const hwThreadsMax = (threadsAvailable - hThreads);
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(hThreads, target);
    const hwThreads = Math.ceil(hackSecurityIncrease / ns.weakenAnalyze(1, cpuCores));
    if (hwThreads > hwThreadsMax) {
        // ns.tprint(`HW threads max (${hwThreads}) is less than calculated (${hwThreadsMax})`);
        return [];
    }

    /**
     * Grow threads
     */
    const gThreadsMax = (threadsAvailable - hThreads - hwThreads);
    let gThreads = Math.ceil(ns.formulas.hacking.growThreads(server, player, server.moneyMax!, cpuCores));
    gThreads = Math.ceil(gThreads);
    if (gThreads > gThreadsMax) {
        // ns.tprint(`Grow threads max (${gThreadsMax}) is less than calculated (${gThreads})`);
        return [];
    }

    /**
     * GW - Weaken to counteract grow() security increase
     */
    const gwThreadsMax = (threadsAvailable - hThreads - hwThreads - gThreads);
    const growSecurityIncrease = ns.growthAnalyzeSecurity(gThreads, undefined, cpuCores);
    const gwThreads = Math.ceil(growSecurityIncrease / ns.weakenAnalyze(1, cpuCores));
    if (gwThreads > gwThreadsMax) {
        // ns.tprint(`GW threads max (${gwThreadsMax}) is less than calculated (${gwThreads})`);
        return [];
    }

    // ns.tprint(`Hack Batch for threads is ${[ hThreads, hwThreads, gThreads, gwThreads ]}`);

    return [ hThreads, hwThreads, gThreads, gwThreads ];
}

export function calculateOptimalBatch(ns: NS, target: string, threadsAvailable: number, cpuCores = 1): Batch {
    const player = ns.getPlayer();
    const targetServer = ns.getServer(target);

    targetServer.hackDifficulty = targetServer.minDifficulty;

    const weakenTime = ns.formulas.hacking.weakenTime(targetServer, player);
    const hackTime = ns.formulas.hacking.hackTime(targetServer, player);
    const growTime = ns.formulas.hacking.growTime(targetServer, player);

    const batch = {
        hThreads: 0,
        hwThreads: 0,
        gThreads: 0,
        gwThreads: 0,
        totalThreads: 0,

        hDelay: weakenTime - hackTime,
        hwDelay: 0,
        gDelay: weakenTime - growTime,
        gwDelay: 0,
    };

    const hackPct = ns.formulas.hacking.hackPercent(targetServer, player);

    // We have a budget of about 100 loops per server to calculate
    // percentages (Keeps the work needed to a minimum)
    if (threadsAvailable > 256) {
        // ns.tprint(`Calculating batch for ${threadsAvailable} ( > 256 )`);
        for (let targetPercent = 0.01; targetPercent <= 0.05; targetPercent += 0.01) {
            const hThreads = Math.max(1, Math.floor(targetPercent / hackPct));
            if (hThreads === 0) continue;
            const newBatch = calculateBatchForHackThreads(ns, target, threadsAvailable, cpuCores, hackPct, hThreads);
            // ns.tprint(`TA > 256: New batch for ${targetPercent * 100}% is ${JSON.stringify(newBatch)}`);
            if (newBatch.length === 0 || newBatch.find(value => value === 0) === 0) {
                // ns.tprint(`TA > 256: Rejected (${targetPercent * 100}%) batch is ${newBatch[0]} / ${newBatch[1]} / ${newBatch[2]} / ${newBatch[3]} / ${newBatch.reduce((acc, val) => acc + val, 0)}`);
                break;
            }

            batch.hThreads = newBatch[0];
            batch.hwThreads = newBatch[1];
            batch.gThreads = newBatch[2];
            batch.gwThreads = newBatch[3];
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
            // ns.tprint(`New (${targetPercent * 100}%) batch is ${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`)
        }
    } else {
        const hThreadsMax = Math.max(1, Math.floor(0.05 / hackPct));
        // ns.tprint(`( < 256 )Threads Available: ${threadsAvailable} hThreadsMax: ${hThreadsMax} hackPct: ${hackPct}`);
        for (let hThreads = 1; hThreads <= hThreadsMax; hThreads++) {
            // ns.tprint(`( < 256 ) ${hThreads}`);
            const newBatch = calculateBatchForHackThreads(ns, target, threadsAvailable, cpuCores, hackPct, hThreads);
            // ns.tprint(`New batch is ${JSON.stringify(newBatch)}`);
            if (newBatch.length === 0) {
                // ns.tprint(`Rejected batch is ${newBatch[0]} / ${newBatch[1]} / ${newBatch[2]} / ${newBatch[3]} / ${newBatch.reduce((acc, val) => acc + val, 0)}`);
                break;
            }

            batch.hThreads = newBatch[0];
            batch.hwThreads = newBatch[1];
            batch.gThreads = newBatch[2];
            batch.gwThreads = newBatch[3];
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
            // ns.tprint(`New batch is ${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`);
        }
    }

    // ns.tprint(`Batch for ${threadsAvailable} threads is ${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`);
    // ns.exit();

    return batch;
}

export function getBatchDelayForServer(ns: NS, target: Server, player: Player): BatchDelay {
    const weakenTime = ns.formulas.hacking.weakenTime(target, player);
    const hackTime = ns.formulas.hacking.hackTime(target, player);
    const growTime = ns.formulas.hacking.growTime(target, player);

    const hackDelay = weakenTime - hackTime;
    const growDelay = weakenTime - growTime;

    const hTotalTime = hackTime + hackDelay;
    const gTotalTime = growTime + growDelay;

    if (hTotalTime !== weakenTime) {
        throw new Error(`Delay math broken hTotalTime !== weakenTime: ${hTotalTime} !== ${weakenTime}`);
    }

    if (gTotalTime !== weakenTime) {
        throw new Error(`Delay math broken gTotalTime !== weakenTime: ${gTotalTime} !== ${weakenTime}`);
    }

    return {
        hackDelay,
        growDelay,
    };
}