import { NS, Player, Server } from '@ns';
import { ServerList } from '/lib/ServerList';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';
import { getAvailableThreads, getMaxThreads, getRam } from '/lib/servers';


const sleepMillis = 50;

// Static value because hack.ts only ever uses one method. The max ram usage is 1.85gb
let HACK_SCRIPT_RAM = 1.6 + 0.25;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * 12));
    ns.print('Hacker is booting up, please wait...');
    HACK_SCRIPT_RAM = Math.max(
        1.6 + ns.getFunctionRamCost('hack'),
        1.6 + ns.getFunctionRamCost('grow'),
        1.6 + ns.getFunctionRamCost('weaken'),
    );

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
    private now = performance.now();


    private target = 'n00dles';
    private hackState: HackState = HackState.Idle;

    private batches: number[] = [];

    private readonly batchByRam = new Map<number, Batch>();
    private readonly batchCache = new Map<number, Batch>();

    private totalThreads = 0;
    private availableThreads = 0;

    private stats = new Map<string, any>();
    private targetStats = new Map<string, any>();
    private hackStats = new Map<string, any>();


    constructor(ns: NS) {
        this.ns = ns;
        this.serverList = new ServerList(ns);
    }

    public async tick() {
        this.now = performance.now();
        await this.serverList.onTick();

        this.batches = this.batches.filter((batchTimeout) => batchTimeout > this.now);

        if (this.serverList.getLastUpdate() > this.lastServerListUpdate) {
            this.lastServerListUpdate = this.serverList.getLastUpdate();
            // Recalculate values that are based on threads.
            this.totalThreads = this.countTotalThreads();

            for (const [ host, _ ] of this.serverList.servers) {
                if (host !== 'home') {
                    this.ns.scp('hack.ts', host, 'home');
                }
            }
        }

        this.availableThreads = this.countAvailableThreads();

        // Sanity check
        let sanity = true;
        if (this.now > this.timeUntilNextAction) {
            for (const [ host, botNetServer ] of this.serverList.botNet) {
                if (this.ns.scriptRunning('hack.ts', host)) {
                    sanity = false;
                    break;
                }
            }
        }

        if (!sanity) {
            this.ns.tprint(`ERROR: Time until next action wasn't long enough. There are other scripts running.` + new Date().toLocaleTimeString());
            this.ns.tprint(`ERROR: Now: ${this.now} > timeUntilNextAction: ${this.timeUntilNextAction}. Diff: ${this.timeUntilNextAction - this.now}`);
            this.ns.tprint(`ERROR: We were in ${this.hackState.toString()} state.`);
            await this.ns.sleep(500);
        } else if (this.now > this.timeUntilNextAction) {
            await this.ns.sleep(100);
            const newTarget = this.pickBestTarget();
            if (newTarget !== this.target) {
                this.ns.print(`New target selected: ${newTarget}`);
                this.target = newTarget;
            }

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
                    this.grow(this.target);
                    break;
                case HackState.Weakening:
                    this.weaken(this.target);
                    // We often find ourselves having to weaken the target but we don't use all the available threads.
                    // Might as well queue up a batch of grows, and maybe some hacks too
                    if (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target)) {
                        this.grow(this.target);
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

        for (const [ host, _ ] of this.serverList.servers) {
            threads += getMaxThreads(this.ns, host, HACK_SCRIPT_RAM);
        }

        return threads;
    }

    private countAvailableThreads(): number {
        let threads = 0;
        for (const [ host, _ ] of this.serverList.servers) {
            threads += getAvailableThreads(this.ns, host, HACK_SCRIPT_RAM);
        }
        return threads;
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
        if (server.requiredHackingSkill * 2 > player.skills.hacking) return 0;
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

        for (const [ host, server ] of this.serverList.homeServers) {
            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;

            const serverThreads = getAvailableThreads(this.ns, host, HACK_SCRIPT_RAM);
            if (serverThreads === 0) continue;

            this.ns.scp('hack.ts', host, 'home');
            const weakenAmount = this.ns.weakenAnalyze(1, server.cpuCores);
            const threadsNeededToWeaken = Math.ceil((securityLevel - securityLevelTarget) / weakenAmount);
            const threads = Math.min(serverThreads, threadsNeededToWeaken);
            if (threads === 0) continue;
            this.ns.exec('hack.ts', host, {
                threads,
                ramOverride: HACK_SCRIPT_RAM,
                temporary: true,
            }, 'weaken', target);

            securityLevel -= weakenAmount * threads;
            threadsAvailable -= threads;
        }

        for (const [ host, server ] of this.serverList.purchasedServers) {
            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;

            const serverThreads = getAvailableThreads(this.ns, host, HACK_SCRIPT_RAM);
            if (serverThreads === 0) continue;

            this.ns.scp('hack.ts', host, 'home');
            const weakenAmount = this.ns.weakenAnalyze(1, server.cpuCores);
            const threadsNeededToWeaken = Math.ceil((securityLevel - securityLevelTarget) / weakenAmount);
            const threads = Math.min(serverThreads, threadsNeededToWeaken);
            if (threads === 0) continue;
            this.ns.exec('hack.ts', host, {
                threads,
                ramOverride: HACK_SCRIPT_RAM,
                temporary: true,
            }, 'weaken', target);

            securityLevel -= weakenAmount * threads;
            threadsAvailable -= threads;
        }

        for (const [ host, server ] of this.serverList.botNet) {
            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;

            const serverThreads = getAvailableThreads(this.ns, host, HACK_SCRIPT_RAM);
            if (serverThreads === 0) continue;

            this.ns.scp('hack.ts', host, 'home');
            const weakenAmount = this.ns.weakenAnalyze(1, server.cpuCores);
            const threadsNeededToWeaken = Math.ceil((securityLevel - securityLevelTarget) / weakenAmount);
            const threads = Math.min(serverThreads, threadsNeededToWeaken);
            if (threads === 0) continue;
            this.ns.exec('hack.ts', host, {
                threads,
                ramOverride: HACK_SCRIPT_RAM,
                temporary: true,
            }, 'weaken', target);

            securityLevel -= weakenAmount * threads;
            threadsAvailable -= threads;
        }

        this.timeUntilNextAction = Math.max(this.timeUntilNextAction, performance.now() + this.ns.getWeakenTime(target) + 500);
    }

    private grow(target: string) {
        const threadsAvailable = this.countAvailableThreads();

        let batch = calculateBatchForGrowThreads(this.ns, target, threadsAvailable);
        if (batch.length === 0) {
            throw new Error('Could not calculate a batch for grow threads');
        }

        const server = this.ns.getServer(target);
        const player = this.ns.getPlayer();

        const growTime = this.ns.formulas.hacking.growTime(server, player);
        const weakenTime = this.ns.formulas.hacking.weakenTime(server, player);
        const growDelay = weakenTime - growTime;

        let [ gThreads, gwThreads ] = batch;

        [ gThreads, gwThreads ] = this.queueGrow(this.serverList.homeServers, target, gThreads, gwThreads, growDelay);
        [ gThreads, gwThreads ] = this.queueGrow(this.serverList.purchasedServers, target, gThreads, gwThreads, growDelay);
        [ gThreads, gwThreads ] = this.queueGrow(this.serverList.botNet, target, gThreads, gwThreads, growDelay);

        this.timeUntilNextAction = Math.max(this.timeUntilNextAction, performance.now() + weakenTime + 500);
    }

    private queueGrow(servers: Map<string, Server>, target: string, gThreads: number, gwThreads: number, growDelay: number): [ gThreads: number, gwThreads: number ] {
        for (const [ host ] of servers) {
            if (gThreads <= 0 && gwThreads <= 0) {
                break;
            }

            let serverThreads = getAvailableThreads(this.ns, host, HACK_SCRIPT_RAM);


            if (serverThreads > 0 && gThreads > 0) {
                let threads = Math.min(serverThreads, gThreads);
                this.ns.exec('hack.ts', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                    temporary: true,
                }, 'grow', target, growDelay);
                serverThreads -= threads;
                gThreads -= threads;
            }

            if (serverThreads > 0 && gwThreads > 0) {
                let threads = Math.min(serverThreads, gwThreads);
                this.ns.exec('hack.ts', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                    temporary: true,
                }, 'weaken', target);
                serverThreads -= threads;
                gwThreads -= threads;
            }
        }

        return [ gThreads, gwThreads ];
    }

    private calculateBatchesByRam() {
        this.batchByRam.clear();


        for (let i = 1; i <= 20; i++) {
            const serverRam = Math.pow(2, i);
            const threads = Math.floor(serverRam / HACK_SCRIPT_RAM);

            // TODO: Maybe take CPU cores into account?
            const batch = calculateOptimalBatch(this.ns, this.target, threads, 1);
            if (batch.totalThreads > 0) {
                this.batchByRam.set(serverRam, batch);
            }
        }
    }

    private batchNumber = 0;

    private crudeHack(target: string) {
        // this.calculateBatchesByRam();
        this.batchCache.clear();
        this.batchNumber = 0;

        this.queueHack(this.serverList.homeServers);
        this.queueHack(this.serverList.purchasedServers);
        this.queueHack(this.serverList.botNet);

        this.timeUntilNextAction = Math.max(this.timeUntilNextAction, performance.now() + this.ns.getWeakenTime(target) + 2500);
    }


    private queueHack(hosts: Map<string, Server>) {
        const targetServer = this.ns.getServer(this.target);
        const delay = getBatchDelayForServer(this.ns, targetServer, this.ns.getPlayer())
        for (const [ host, server ] of hosts) {
            if (this.batches.length * 4 >= 200_000) {
                break;
            }

            const [ availableRam, maxRam ] = getRam(this.ns, host);
            let threadsAvailable = Math.floor(availableRam / HACK_SCRIPT_RAM);
            // this.ns.tprint(`Server: ${host} has ${threadsAvailable} threads available for hacking.`);

            let batch: Batch;
            let biggestRam = 0;
            if (host === 'home') {
                batch = calculateOptimalBatch(this.ns, this.target, threadsAvailable, server.cpuCores);
            } else {
                if (this.batchCache.has(threadsAvailable)) {
                    batch = this.batchCache.get(threadsAvailable)!;
                } else {
                    batch = calculateOptimalBatch(this.ns, this.target, threadsAvailable)
                    this.batchCache.set(threadsAvailable, batch);
                }
                // for (const [ ram, newBatch ] of this.batchByRam) {
                //     if (ram <= availableRam && ram > biggestRam) {
                //         biggestRam = ram;
                //         batch = newBatch;
                //     }
                // }
            }

            if (!batch) {
                this.ns.tprint(`WARN Server: ${host} was unable to queue up a batch. AvailableRam: ${this.ns.formatRam(availableRam)} MaxRam: ${this.ns.formatRam(maxRam)} BatchRam: ${this.ns.formatRam(biggestRam)}`);
                continue;
            }

            if (batch.hThreads === 0) {
                this.ns.tprint(`Error Server: ${host} had a batch with 0 hThreads. Ram: ${this.ns.formatRam(biggestRam)}`);
                continue;
            }

            if (batch.hwThreads === 0) {
                this.ns.tprint(`Error Server: ${host} had a batch with 0 hwThreads. Ram: ${this.ns.formatRam(biggestRam)}`);
                continue;
            }

            if (batch.gThreads === 0) {
                this.ns.tprint(`Error Server: ${host} had a batch with 0 gThreads. Ram: ${this.ns.formatRam(biggestRam)}`);
                continue;
            }

            if (batch.gwThreads === 0) {
                this.ns.tprint(`Error Server: ${host} had a batch with 0 gwThreads. Ram: ${this.ns.formatRam(biggestRam)}`);
                continue;
            }

            if (threadsAvailable < batch.totalThreads) {
                this.ns.tprint(`WARN Server: ${host} didn't have enough threads for batch. ${threadsAvailable} < ${batch.totalThreads}`);
                continue;
            }


            while (threadsAvailable >= batch.totalThreads) {
                if (this.batches.length * 4 >= 200_000) {
                    break;
                }
                // this.ns.tprint(`Server: ${host} is executing hack with ${batch.hThreads} threads`);
                // this.ns.tprint(`Server: ${host} is executing hack-weaken with ${batch.hwThreads} threads`);
                // this.ns.tprint(`Server: ${host} is executing grow with ${batch.gThreads} threads`);
                // this.ns.tprint(`Server: ${host} is executing grow-weaken with ${batch.gwThreads} threads`);

                this.batchNumber++;
                this.ns.exec('hack.ts', host, {
                    threads: batch.hThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                    temporary: true,
                }, 'hack', this.target, delay.hackDelay, `batch-${this.batchNumber}`);

                this.ns.exec('hack.ts', host, {
                    threads: batch.hwThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                    temporary: true,
                }, 'weaken', this.target, 0, `batch-${this.batchNumber}`);

                this.ns.exec('hack.ts', host, {
                    threads: batch.gThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                    temporary: true,
                }, 'grow', this.target, delay.growDelay, `batch-${this.batchNumber}`);

                this.ns.exec('hack.ts', host, {
                    threads: batch.gwThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                    temporary: true,
                }, 'weaken', this.target, 0, `batch-${this.batchNumber}`);


                this.batches.push(performance.now() + this.ns.getWeakenTime(this.target));
                threadsAvailable -= batch.totalThreads;
            }
        }
    }
}

function calculateBatchForGrowThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1): number[] {
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

function calculateBatchForHackThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1, hackPct: number, hThreads: number): [ hThreads: number, hwThreads: number, gThreads: number, gwThreads: number ] {
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

