import { NS, Server } from '@ns';
import { ServerList } from '/lib/ServerList';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


const sleepMillis = 50;

// Static value because hack.js only ever uses one method. The max ram usage is 1.85gb
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
    private now = Date.now();


    private target = 'n00dles';
    // private target = 'rho-construction';
    private hackState: HackState = HackState.Idle;

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
    }

    public async tick() {
        this.now = Date.now();
        await this.serverList.onTick();

        this.batches = this.batches.filter((batchTimeout) => batchTimeout > this.now);

        if (this.serverList.getLastUpdate() > this.lastServerListUpdate) {
            this.lastServerListUpdate = this.serverList.getLastUpdate();
            // Recalculate values that are based on threads.
            this.totalThreads = this.countTotalThreads();
            this.calculateBatchesByHost();

            for (const [ host, _ ] of this.serverList.servers) {
                if (host !== 'home') {
                    this.ns.scp('hack.js', host, 'home');
                }
            }
        }

        this.availableThreads = this.countAvailableThreads();

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
            const newTarget = this.pickBestTarget();
            if (newTarget !== this.target) {
                this.ns.print(`New target selected: ${newTarget}`);
                this.target = newTarget;
                this.calculateBatchesByHost();
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
        for (const [ host, _ ] of this.serverList.homeServers) {
            threads += this.countTotalThreadsOnHost(host);
        }
        for (const [ host, _ ] of this.serverList.purchasedServers) {
            threads += this.countTotalThreadsOnHost(host);
        }
        for (const [ host, _ ] of this.serverList.botNet) {
            threads += this.countTotalThreadsOnHost(host);
        }

        return threads;
    }

    private countAvailableThreads(): number {
        let threads = 0;
        for (const [ host, _ ] of this.serverList.homeServers) {
            threads += this.countAvailableThreadsOnHost(host);
        }
        for (const [ host, _ ] of this.serverList.purchasedServers) {
            threads += this.countAvailableThreadsOnHost(host);
        }
        for (const [ host, _ ] of this.serverList.botNet) {
            threads += this.countAvailableThreadsOnHost(host);
        }

        return threads;
    }

    private countTotalThreadsOnHost(host: string): number {
        let reservedRam = 0;

        // Make sure we're always taking hacker.js and servers.js into account.
        if (host === 'home') {
            if (this.ns.getServerMaxRam(host) > 512) {
                reservedRam += 64;
            }
            reservedRam += this.ns.getScriptRam('hacker.js', host);
            reservedRam += this.ns.getScriptRam('servers.js', host);
            reservedRam += this.ns.getScriptRam('train.js', host);
        }

        const serverRam = this.ns.getServerMaxRam(host) - reservedRam;

        if (serverRam < HACK_SCRIPT_RAM) {
            return 0;
        }

        return Math.floor(serverRam / HACK_SCRIPT_RAM);
    }

    private countAvailableThreadsOnHost(host: string): number {
        let maxRam = this.ns.getServerMaxRam(host);
        let reservedRam = 0;

        // Make sure we're always taking hacker.js and servers.js into account.
        if (host === 'home') {
            if (this.ns.getServerMaxRam(host) > 512) {
                reservedRam += 64;
            }
            if (!this.ns.scriptRunning('hacker.js', host)) {
                reservedRam += this.ns.getScriptRam('hacker.js', host);
            }

            if (!this.ns.scriptRunning('servers.js', host)) {
                reservedRam += this.ns.getScriptRam('servers.js', host);
            }

            if (!this.ns.scriptRunning('train.js', host)) {
                reservedRam += this.ns.getScriptRam('train.js', host);
            }
        }

        let serverRam = maxRam - reservedRam - this.ns.getServerUsedRam(host);

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

        for (const [ host, server ] of this.serverList.homeServers) {
            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;

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
        }

        for (const [ host, server ] of this.serverList.purchasedServers) {
            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;

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
        }

        for (const [ host, server ] of this.serverList.botNet) {
            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;

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

        for (const [ host, server ] of this.serverList.homeServers) {
            if (gThreads <= 0 && gwThreads <= 0) {
                break;
            }
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
        }

        for (const [ host, server ] of this.serverList.purchasedServers) {
            if (gThreads <= 0 && gwThreads <= 0) {
                break;
            }
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
        }

        for (const [ host, server ] of this.serverList.botNet) {
            if (gThreads <= 0 && gwThreads <= 0) {
                break;
            }
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
        }

        this.timeUntilNextAction = this.now + this.ns.getWeakenTime(target) + 500;
    }

    private calculateBatchesByHost() {
        for (const [ host, server ] of this.serverList.homeServers) {
            const threadsAvailable = this.countTotalThreadsOnHost(host);
            const batch = calculateOptimalBatch(this.ns, this.target, threadsAvailable, server.cpuCores);
            if (batch.totalThreads === 0) {
                if (this.batchByServer.has(host)) {
                    this.batchByServer.delete(host);
                }
                continue;
            }
            this.batchByServer.set(host, batch);
        }

        for (const [ host, server ] of this.serverList.purchasedServers) {
            const threadsAvailable = this.countTotalThreadsOnHost(host);
            // this.ns.tprint(`Calculating batch for purchased server: ${host}. Total threads: ${threadsAvailable}`);
            const batch = calculateOptimalBatch(this.ns, this.target, threadsAvailable, server.cpuCores);
            // this.ns.tprint(`Batch for ${host} is ${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`)
            if (batch.totalThreads === 0) {
                // this.ns.exit();
                if (this.batchByServer.has(host)) {
                    this.batchByServer.delete(host);
                }
                continue;
            }
            this.batchByServer.set(host, batch);
        }

        for (const [ host, server ] of this.serverList.botNet) {
            const threadsAvailable = this.countTotalThreadsOnHost(host);
            const batch = calculateOptimalBatch(this.ns, this.target, threadsAvailable, server.cpuCores);
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

        // this.ns.tprint('Queuing up a batch. ' + new Date().toString());
        const delayLimit = this.ns.getWeakenTime(target) - 500;
        let initialDelay = 0;

        initialDelay = this.queueHack(this.serverList.homeServers, initialDelay, delayLimit);
        initialDelay = this.queueHack(this.serverList.purchasedServers, initialDelay, delayLimit);
        initialDelay = this.queueHack(this.serverList.botNet, initialDelay, delayLimit);

        this.timeUntilNextAction = this.now + this.ns.getWeakenTime(target) + initialDelay + 1000;
    }

    private batchNumber = 0;

    private queueHack(hosts: Map<string, Server>, initialDelay: number, delayLimit: number): number {
        if (initialDelay >= delayLimit) {
            return initialDelay;
        }

        for (const [ host, _ ] of hosts) {
            if (initialDelay >= delayLimit) {
                // this.ns.tprint(`WARN Initial delay (${initialDelay}) is >= ${delayLimit}. Will not queue any more work.`);
                break;
            }
            let threadsAvailable = this.countAvailableThreadsOnHost(host);
            // this.ns.tprint(`Server: ${host} has ${threadsAvailable} threads available for hacking.`);

            const batch = this.batchByServer.get(host);

            if (!batch) {
                this.ns.tprint(`WARN Server: ${host} was unable to queue up a batch.`);
                continue;
            }
            if (threadsAvailable < batch.totalThreads) {
                this.ns.tprint(`WARN Server: ${host} didn't have enough threads for batch. ${threadsAvailable} < ${batch.totalThreads}`);
                continue;
            }


            while (threadsAvailable >= batch.totalThreads) {
                // this.ns.tprint(`Server: ${host} is executing hack with ${batch.hThreads} threads`);
                // this.ns.tprint(`Server: ${host} is executing hack-weaken with ${batch.hwThreads} threads`);
                // this.ns.tprint(`Server: ${host} is executing grow with ${batch.gThreads} threads`);
                // this.ns.tprint(`Server: ${host} is executing grow-weaken with ${batch.gwThreads} threads`);

                this.batchNumber++;
                this.ns.exec('hack.js', host, {
                    threads: batch.hThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'hack', this.target, initialDelay + batch.hDelay, `batch-${this.batchNumber}`);

                this.ns.exec('hack.js', host, {
                    threads: batch.hwThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', this.target, initialDelay + batch.hwDelay, `batch-${this.batchNumber}`);

                this.ns.exec('hack.js', host, {
                    threads: batch.gThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'grow', this.target, initialDelay + batch.gDelay, `batch-${this.batchNumber}`);

                this.ns.exec('hack.js', host, {
                    threads: batch.gwThreads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', this.target, initialDelay + batch.gwDelay, `batch-${this.batchNumber}`);


                this.batches.push(Date.now() + this.ns.getWeakenTime(this.target) + initialDelay);
                threadsAvailable -= batch.totalThreads;
                initialDelay += 0;

                if (initialDelay >= delayLimit) {
                    // this.ns.tprint(`WARN Initial delay (${initialDelay}) is >= ${delayLimit}. Will not queue any more work.`);
                    break;
                }
            }
        }

        return initialDelay;
    }
}

function calculateBatchForGrowThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1): number[] {
    const player = ns.getPlayer();
    const server = ns.getServer(target);
    server.hackDifficulty = server.minDifficulty;

    let gThreads = Math.min(Math.ceil(ns.formulas.hacking.growThreads(server, player, <number>server.moneyMax, cpuCores)), threadsAvailable);
    const growSecurityIncrease = ns.growthAnalyzeSecurity(gThreads, undefined, cpuCores);
    const gwThreads = Math.ceil(growSecurityIncrease / calculateWeakenAmount(ns, 1, cpuCores));
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

function calculateBatchForHackThreads(ns: NS, target: string, threadsAvailable: number, cpuCores = 1, hackPct: number, hThreads: number): number[] {
    const player = ns.getPlayer();
    const server = ns.getServer(target);
    server.hackDifficulty = server.minDifficulty;

    const hackAmount = hackPct * hThreads * server.moneyAvailable!;
    server.moneyAvailable = Math.floor(server.moneyMax! - hackAmount);


    /**
     * HW - Weaken to counteract hack() security increase
     */
    const hwThreadsMax = (threadsAvailable - hThreads);
    const hackSecurityIncrease = ns.hackAnalyzeSecurity(hThreads, target);
    const hwThreads = Math.ceil(hackSecurityIncrease / calculateWeakenAmount(ns, 1, cpuCores));
    if (hwThreads > hwThreadsMax) {
        // ns.tprint(`HW threads max (${hwThreads}) is less than calculated (${hwThreadsMax})`)
        return [];
    }

    /**
     * Grow threads
     */
    const gThreadsMax = (threadsAvailable - hThreads - hwThreads);
    let gThreads = Math.ceil(ns.formulas.hacking.growThreads(server, player, server.moneyMax!, cpuCores));
    gThreads = Math.ceil(gThreads);
    if (gThreads > gThreadsMax) {
        // ns.tprint(`Grow threads max (${gThreadsMax}) is less than calculated (${gThreads})`)
        return [];
    }

    /**
     * GW - Weaken to counteract grow() security increase
     */
    const gwThreadsMax = (threadsAvailable - hThreads - hwThreads - gThreads);
    const growSecurityIncrease = ns.growthAnalyzeSecurity(gThreads, undefined, cpuCores);
    const gwThreads = Math.ceil(growSecurityIncrease / calculateWeakenAmount(ns, 1, cpuCores));
    if (gwThreads > gwThreadsMax) {
        // ns.tprint(`GW threads max (${gwThreadsMax}) is less than calculated (${gwThreads})`)
        return [];
    }

    // ns.tprint(`Hack Batch for threads is ${[ hThreads, hwThreads, gThreads, gwThreads ]}`)

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

        hDelay: Math.ceil(weakenTime - ns.formulas.hacking.hackTime(targetServer, player)),
        hwDelay: Math.ceil(weakenTime - ns.formulas.hacking.weakenTime(targetServer, player)),
        gDelay: Math.ceil(weakenTime - ns.formulas.hacking.growTime(targetServer, player)),
        gwDelay: Math.ceil(weakenTime - ns.formulas.hacking.weakenTime(targetServer, player)),
    };

    const hackPct = ns.formulas.hacking.hackPercent(targetServer, player);

    // We have a budget of about 100 loops per server to calculate percentages (Keeps the work needed to a minimum)
    if (threadsAvailable > 256) {
        for (let targetPercent = 0.01; targetPercent <= .05; targetPercent += 0.01) {
            const hThreads = Math.floor(targetPercent / hackPct);
            const newBatch = calculateBatchForHackThreads(ns, target, threadsAvailable, cpuCores, hackPct, hThreads);
            if (newBatch.length === 0 || newBatch.find(value => value === 0)) {
                // ns.tprint(`Rejected (${targetPercent * 100}%) batch is ${newBatch[0]} / ${newBatch[1]} / ${newBatch[2]} / ${newBatch[3]} / ${newBatch.reduce((acc, val) => acc + val, 0)}`)
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
        const hThreadsMax = Math.floor(0.05 / hackPct);
        for (let hThreads = 1; hThreads <= hThreadsMax; hThreads++) {
            const newBatch = calculateBatchForHackThreads(ns, target, threadsAvailable, cpuCores, hackPct, hThreads);
            if (newBatch.length === 0) {
                // ns.tprint(`Rejected batch is ${newBatch[0]} / ${newBatch[1]} / ${newBatch[2]} / ${newBatch[3]} / ${newBatch.reduce((acc, val) => acc + val, 0)}`)
                break;
            }

            batch.hThreads = newBatch[0];
            batch.hwThreads = newBatch[1];
            batch.gThreads = newBatch[2];
            batch.gwThreads = newBatch[3];
            batch.totalThreads = batch.hThreads + batch.hwThreads + batch.gThreads + batch.gwThreads;
            // ns.tprint(`New batch is ${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`)
        }
    }

    // ns.tprint(`Batch is ${batch.hThreads} / ${batch.hwThreads} / ${batch.gThreads} / ${batch.gwThreads} / ${batch.totalThreads}`)
    // ns.exit();

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