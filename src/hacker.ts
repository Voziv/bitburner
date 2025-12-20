import { NS } from '@ns';
import { ServerList } from '/lib/ServerList';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


const sleepMillis = 50;

// Static value because hack.js only ever uses one method. The max ram usage is 1.85gb
const HACK_SCRIPT_RAM = 1.6 + 0.25;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * 12));
    ns.print('Hacker is booting up, please wait...');

    const hacker = new Hacker(ns);

    while (true) {
        await hacker.tick();
        await ns.sleep(sleepMillis);
    }
}

enum HackState {
    Idle = 'Idle',
    Growing = 'Growing',
    Weakening = 'Weakening',
    Hacking = 'Hacking',
}

export class Hacker {
    private readonly ns: NS;

    private serverList: ServerList;
    private lastServerListUpdate = 0;
    private timeUntilNextAction = 0;
    private now = Date.now();


    private target = 'n00dles';
    private hackState: HackState = HackState.Idle;

    private batch: Batch;

    private batches: number[] = [];

    private batchByServer = new Map<string, Batch>();

    private totalThreads = 0;
    private availableThreads = 0;

    private stats = new Map<string, any>();
    private targetStats = new Map<string, any>();
    private hackStats = new Map<string, any>();


    constructor(ns: NS) {
        this.ns = ns;
        this.serverList = new ServerList(ns);
        this.batch = calculateOptimalBatch(this.ns, this.target, this.totalThreads);
    }

    public async tick() {
        this.now = Date.now();
        await this.serverList.onTick();

        this.batches = this.batches.filter((batchTimeout) => batchTimeout > this.now);

        if (this.serverList.getLastUpdate() > this.lastServerListUpdate) {
            this.lastServerListUpdate = this.serverList.getLastUpdate();
            // Recalculate values that are based on threads.
            this.totalThreads = this.countTotalThreads();
            this.batch = calculateOptimalBatch(this.ns, this.target, this.totalThreads);
            this.calculateBatchesByHost();

            for (const [ host, server ] of this.serverList.botNet) {
                if (host !== 'home') {
                    this.ns.scp('hack.js', host, 'home');
                }
            }
        }

        this.availableThreads = this.countAvailableThreads();

        const newTarget = this.pickBestTarget();
        if (newTarget !== this.target) {
            this.ns.print(`New target selected: ${newTarget}`);
            this.target = newTarget;
            this.batch = calculateOptimalBatch(this.ns, this.target, this.totalThreads);
            this.calculateBatchesByHost();
        }


        // Sanity check
        let sanity = true;
        if (this.now > this.timeUntilNextAction) {
            for (const [ host, botNetServer ] of this.serverList.botNet) {
                if (this.ns.scriptRunning('hack.js', host)) {
                    sanity = false;
                    break;
                }
            }
        }

        if (!sanity) {
            this.ns.tprint(`ERROR: Time until next action wasn't long enough. There are other scripts running.` + new Date().toString());
            this.ns.tprint(`ERROR: Now: ${this.now} > timeUntilNextAction: ${this.timeUntilNextAction}. Diff: ${this.timeUntilNextAction - this.now}`);
            this.ns.tprint(`ERROR: We were in ${this.hackState.toString()} state.`);
            await this.ns.sleep(5000);
        } else if (this.now > this.timeUntilNextAction) {
            if (this.ns.getServerSecurityLevel(this.target) > this.ns.getServerMinSecurityLevel(this.target)) {
                this.hackState = HackState.Weakening;
            } else if (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target)) {
                this.hackState = HackState.Growing;
            } else {
                this.hackState = HackState.Hacking;
            }

            switch (this.hackState) {
                case HackState.Hacking:
                    this.crudeHack(this.target);
                    break;
                case HackState.Growing:
                    if (this.batches.length === 0) {
                        this.grow(this.target);
                    }
                    break;
                case HackState.Weakening:
                    if (this.batches.length === 0) {
                        this.weaken(this.target);
                    }
                    break;
            }
        }
        await this.updateLog();
    }

    private async updateLog() {
        this.stats.set('Used BotNet Threads', `${this.totalThreads - this.availableThreads} / ${this.totalThreads}`);
        this.stats.set('Target', this.target);
        this.stats.set('State', this.hackState);
        this.stats.set('# of Batches', this.batches.length);

        const money = `$${this.ns.formatNumber(this.ns.getServerMoneyAvailable(this.target), 0)} / $${this.ns.formatNumber(this.ns.getServerMaxMoney(this.target), 0)}`;

        this.targetStats.set('Money', money);
        this.targetStats.set('Security', `${this.ns.formatNumber(this.ns.getServerSecurityLevel(this.target))} (Min: ${this.ns.formatNumber(this.ns.getServerMinSecurityLevel(this.target), 0)})`);

        this.targetStats.set(`Now`, `${new Date(this.now).toTimeString()}`);
        this.targetStats.set(`TTNA Date`, `${new Date(this.timeUntilNextAction).toTimeString()}`);
        this.targetStats.set(`TTNA`, `${this.ns.tFormat(this.timeUntilNextAction - this.now)}`);
        this.targetStats.set(`Grow Time`, `${this.ns.tFormat(this.ns.getGrowTime(this.target))}`);
        this.targetStats.set(`Weaken Time`, `${this.ns.tFormat(this.ns.getWeakenTime(this.target))}`);
        this.targetStats.set(`Hack Time`, `${this.ns.tFormat(this.ns.getHackTime(this.target))}`);

        this.ns.clearLog();
        this.ns.ui.setTailTitle(`Hacking ${this.target} (${money})`);

        this.ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * (this.stats.size + this.targetStats.size + this.hackStats.size)));
        printStats(this.ns, this.stats);
        printStats(this.ns, this.targetStats);
        printStats(this.ns, this.hackStats);
        this.ns.ui.renderTail();
    }

    private countTotalThreads(): number {
        let threads = 0;
        for (const [ host, server ] of this.serverList.botNet) {
            threads += this.countTotalThreadsOnHost(host);
        }

        return threads;
    }

    private countAvailableThreads(): number {
        let threads = 0;
        for (const [ host, server ] of this.serverList.botNet) {
            threads += this.countAvailableThreadsOnHost(host);
        }

        return threads;
    }

    private countTotalThreadsOnHost(host: string): number {
        let serverRam = this.ns.getServerMaxRam(host);
        if (host === 'home') {
            serverRam -= (this.ns.getServerMaxRam(host) > 64) ? 32 : 16;
        }

        if (serverRam < HACK_SCRIPT_RAM) {
            return 0;
        }

        return Math.floor(serverRam / HACK_SCRIPT_RAM);
    }

    private countAvailableThreadsOnHost(host: string): number {
        let serverRam = this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);
        if (host === 'home') {
            serverRam -= (this.ns.getServerMaxRam(host) > 64) ? 32 : 16;
        }

        if (serverRam < HACK_SCRIPT_RAM) {
            return 0;
        }

        return Math.floor(serverRam / HACK_SCRIPT_RAM);
    }

    private pickBestTarget() {
        let bestServer = this.ns.getServer(this.target);
        let bestScore = this.scoreServer(this.ns, this.target);

        for (const [ host, server ] of this.serverList.servers) {
            if (host === 'home' || server.purchasedByPlayer || !server.hasAdminRights) {
                continue;
            }

            const score = this.scoreServer(this.ns, host);
            if (score > bestScore) {
                bestScore = score;
                bestServer = server;
            }
        }

        return bestServer.hostname;
    }

    private scoreServer(ns: NS, target: string): number {
        const server = ns.getServer(target);
        const player = ns.getPlayer();
        server.hackDifficulty = server.minDifficulty; // simulate the score being super low
        server.moneyAvailable = server.moneyMax; // simulate the score being super low
        if (ns.formulas.hacking.hackChance(server, player) < 1) return 0;

        const stealPercent = ns.formulas.hacking.hackPercent(server, player);
        const stealAmount = stealPercent * ns.getServerMaxMoney(target);
        return stealAmount / ns.formulas.hacking.hackTime(server, player);
    }

    private weaken(target: string) {
        const securityLevelTarget = this.ns.getServerMinSecurityLevel(target);
        let securityLevel = this.ns.getServerSecurityLevel(target);

        let threadsAvailable = this.totalThreads;

        for (const [ host, server ] of this.serverList.botNet) {
            const serverThreads = this.countAvailableThreadsOnHost(host);
            if (serverThreads === 0) continue;

            this.ns.scp('hack.js', host, 'home');
            const weakenAmount = this.ns.weakenAnalyze(1, server.cpuCores);
            const threadsNeededToWeaken = Math.ceil((securityLevel - securityLevelTarget) / weakenAmount);
            const threads = Math.min(this.countAvailableThreadsOnHost(host), threadsNeededToWeaken);
            if (threads === 0) continue;
            this.ns.exec('hack.js', host, {
                threads,
                ramOverride: HACK_SCRIPT_RAM,
            }, 'weaken', target);

            securityLevel -= weakenAmount * threads;
            threadsAvailable -= threads;

            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;
        }

        this.timeUntilNextAction = this.now + this.ns.getWeakenTime(target) + 500;
    }

    private grow(target: string) {
        const threadsAvailable = this.countAvailableThreads();

        let batch = calculateBatchForGrowThreads(this.ns, target, threadsAvailable);
        if (batch.length === 0) {
            throw new Error('Could not calculate a batch for grow threads');
        }

        let [ gThreads, gwThreads ] = batch;

        for (const [ host, server ] of this.serverList.botNet) {
            let serverThreads = this.countAvailableThreadsOnHost(host);

            if (serverThreads > 0 && gThreads > 0) {
                let threads = Math.min(serverThreads, gThreads);
                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'grow', target);
                serverThreads -= threads;
                gThreads -= threads;
            }

            if (serverThreads > 0 && gwThreads > 0) {
                let threads = Math.min(serverThreads, gwThreads);
                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', target);
                serverThreads -= threads;
                gwThreads -= threads;
            }

            if (gThreads <= 0 && gwThreads <= 0) {
                break;
            }
        }

        this.timeUntilNextAction = this.now + this.ns.getWeakenTime(target) + 500;
    }

    private calculateBatchesByHost() {
        for (const [ host, botNetServer ] of this.serverList.botNet) {
            const threadsAvailable = this.countTotalThreadsOnHost(host);
            const batch = calculateOptimalBatch(this.ns, this.target, threadsAvailable, botNetServer.cpuCores);
            if (batch.totalThreads === 0) {
                if (this.batchByServer.has(host)) {
                    this.batchByServer.delete(host);
                }
                continue;
            }
            this.batchByServer.set(host, batch);
        }
    }

    private crudeHack(target: string) {
        this.ns.tprint('Queuing up a batch. ' + new Date().toString());
        let initialDelay = 0;

        for (const [ host, botNetServer ] of this.serverList.botNet) {
            if (initialDelay >= this.ns.getWeakenTime(target) - 500) break;

            let threadsAvailable = this.countAvailableThreadsOnHost(host);
            const batch = this.batchByServer.get(host);
            if (!batch) continue;
            while (threadsAvailable > batch.totalThreads) {
                if (initialDelay >= this.ns.getWeakenTime(target) - 500) break;

                this.ns.exec('hack.js', host, {
                    threads: batch.hThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'hack', target, initialDelay, batch.hDelay);

                this.ns.exec('hack.js', host, {
                    threads: batch.hwThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', target, initialDelay, batch.hwDelay);

                this.ns.exec('hack.js', host, {
                    threads: batch.gThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'grow', target, initialDelay, batch.gDelay);

                this.ns.exec('hack.js', host, {
                    threads: batch.gwThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', target, initialDelay, batch.gwDelay);


                this.batches.push(Date.now() + this.ns.getWeakenTime(target) + initialDelay);
                threadsAvailable -= batch.totalThreads;
                initialDelay += 1000;
            }
        }

        this.timeUntilNextAction = this.now + this.ns.getWeakenTime(target) + initialDelay + 5000;
    }
}

function calculateBatchForGrowThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1): number[] {
    const player = ns.getPlayer();
    const server = ns.getServer(target);
    server.hackDifficulty = server.minDifficulty;

    /**
     * Grow threads
     */
    const gThreadsMax = Math.floor(threadsAvailable * 0.95);
    let gThreads = Math.min(Math.ceil(ns.formulas.hacking.growThreads(server, player, <number>server.moneyMax, cpuCores)), gThreadsMax);
    if (gThreads > gThreadsMax) {
        return [];
    }

    /**
     * GrowWeaken Threads
     */
    const gwThreadsMax = (threadsAvailable * 0.5);
    let gwThreads = 0;
    for (gThreads; gThreads > 0; gThreads--) {
        const growSecurityIncrease = ns.growthAnalyzeSecurity(gThreads, undefined, cpuCores);
        for (gwThreads = 1; gwThreads <= gwThreadsMax; gwThreads++) {
            const weakenAmount = calculateWeakenAmount(ns, gwThreads, cpuCores);
            if (weakenAmount > growSecurityIncrease) {
                break;
            }
        }
        if ((gwThreads + gThreads) <= threadsAvailable) {
            break;
        }
    }

    if ((gwThreads + gThreads) > threadsAvailable) {
        return [];
    }

    return [ gThreads, gwThreads ];
}

function calculateBatchForHackThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1, hackPct: number, hThreads: number): number[] {
    const player = ns.getPlayer();
    const server = ns.getServer(target);
    server.hackDifficulty = server.minDifficulty;

    const hackAmount = hackPct * hThreads * <number>server.moneyAvailable;
    server.moneyAvailable = Math.floor(<number>server.moneyMax - hackAmount);

    /**
     * HackWeaken Threads
     */
    const hwThreadsMax = (threadsAvailable - hThreads);
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(hThreads, target);
    server.hackDifficulty = <number>server.hackDifficulty + hackSecurityIncrease;

    if (ns.formulas.hacking.hackChance(server, player) < 1) {
        return [];
    }
    server.hackDifficulty = server.minDifficulty;
    let hwThreads = 0;
    for (hwThreads = 1; hwThreads <= hwThreadsMax; hwThreads++) {
        const weakenAmount = calculateWeakenAmount(ns, hwThreads, cpuCores);
        if (weakenAmount > hackSecurityIncrease) {
            break;
        }
    }

    if (hwThreads > hwThreadsMax) {
        return [];
    }

    /**
     * Grow threads
     */
    const gThreadsMax = (threadsAvailable - hThreads - hwThreads);
    let gThreads = Math.ceil(ns.formulas.hacking.growThreads(server, player, <number>server.moneyMax, cpuCores));
    gThreads = Math.ceil(gThreads * 1.3);
    if (gThreads > gThreadsMax) {
        return [];
    }

    /**
     * GrowWeaken Threads
     */
    const gwThreadsMax = (threadsAvailable - hThreads - hwThreads - gThreads);
    const growSecurityIncrease = ns.growthAnalyzeSecurity(gThreads, undefined, cpuCores);
    server.hackDifficulty = <number>server.hackDifficulty + growSecurityIncrease;
    if (ns.formulas.hacking.hackChance(server, player) < 1) {
        return [];
    }
    server.hackDifficulty = server.minDifficulty;
    let gwThreads = 0;
    for (gwThreads = 1; gwThreads <= gwThreadsMax; gwThreads++) {
        const weakenAmount = calculateWeakenAmount(ns, gwThreads, cpuCores);
        if (weakenAmount > growSecurityIncrease) {
            break;
        }
    }

    if (gwThreads > gwThreadsMax) {
        return [];
    }

    return [ hThreads, hwThreads, gThreads, gwThreads ];
}

export function calculateOptimalBatch(ns: NS, target: string, threadsAvailable: number, cpuCores = 1): Batch {
    const player = ns.getPlayer();
    const targetServer = ns.getServer(target);
    targetServer.hackDifficulty = targetServer.minDifficulty;
    const weakenTime = ns.formulas.hacking.weakenTime(targetServer, player);

    const batch = {
        hThreads: 0,
        hwThreads: 0,
        gThreads: 0,
        gwThreads: 0,
        totalThreads: 0,

        hDelay: Math.ceil(weakenTime - ns.formulas.hacking.hackTime(targetServer, player) - 200),
        hwDelay: 0,
        gDelay: Math.ceil(weakenTime - ns.formulas.hacking.growTime(targetServer, player) + 200),
        gwDelay: 400,
    };

    const hackPct = ns.formulas.hacking.hackPercent(targetServer, player);

    // We have a budget of about 100 loops per server to calculate percentages (Keeps the work needed to a minimum)
    if (threadsAvailable > 256) {
        for (let targetPercent = 0.05; targetPercent <= 0.95; targetPercent += 0.05) {
            const hThreads = Math.floor(targetPercent / hackPct);
            const newBatch = calculateBatchForHackThreads(ns, target, threadsAvailable, cpuCores, hackPct, hThreads);
            if (newBatch.length === 0 || newBatch.find(value => value === 0)) {
                break;
            }

            batch.hThreads = newBatch[0];
            batch.hwThreads = newBatch[1];
            batch.gThreads = newBatch[2];
            batch.gwThreads = newBatch[3];
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
        }
    } else {
        const hThreadsMax = Math.floor(0.95 / hackPct);
        for (let hThreads = 1; hThreads <= hThreadsMax; hThreads++) {
            const newBatch = calculateBatchForHackThreads(ns, target, threadsAvailable, cpuCores, hackPct, hThreads);
            if (newBatch.length === 0) {
                break;
            }

            batch.hThreads = newBatch[0];
            batch.hwThreads = newBatch[1];
            batch.gThreads = newBatch[2];
            batch.gwThreads = newBatch[3];
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
        }
    }

    return batch;
}

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

function calculateWeakenAmount(ns: NS, threads: number, cores = 1): number {
    // Grabbed it from the source code to avoid ram penalties :D
    // const coreBonus = getCoreBonus(cores);
    // return ServerConstants.ServerWeakenAmount * threads * coreBonus * currentNodeMults.ServerWeakenRate;
    // ServerConstants.ServerWeakenAmount = 0.05
    // currentNodeMults.ServerWeakenRate -- Tied to a future bitnode as I
    const coreBonus = 1 + (cores - 1) / 16;
    return 0.05 * threads * coreBonus * ns.getBitNodeMultipliers().ServerWeakenRate;
}