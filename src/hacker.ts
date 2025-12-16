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


    private target = 'n00dles';
    private hackState: HackState = HackState.Idle;

    private batch: Batch = {
        hackThreads: 0,
        growThreads: 0,
        weakenThreads: 0,
        totalThreads: 0,
    };

    private batches: number[] = [];

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
        await this.serverList.onTick();

        const now = Date.now();
        this.batches = this.batches.filter((batchTimeout) => batchTimeout > now);

        if (this.serverList.getLastUpdate() > this.lastServerListUpdate) {
            this.lastServerListUpdate = this.serverList.getLastUpdate();
            // Recalculate values that are based on threads.
            this.totalThreads = this.countTotalThreads();
            this.batch = calculateOptimalBatch(this.ns, this.target, this.totalThreads);
        }

        this.availableThreads = this.countAvailableThreads();

        const newTarget = this.pickBestTarget();
        if (newTarget !== this.target) {
            this.ns.print(`New target selected: ${newTarget}`);
            this.target = newTarget;
            this.batch = calculateOptimalBatch(this.ns, this.target, this.totalThreads);
        }

        if (this.ns.getServerSecurityLevel(this.target) > this.ns.getServerMinSecurityLevel(this.target)) {
            this.hackState = HackState.Weakening;
        } else if (this.ns.getServerMoneyAvailable(this.target) < this.ns.getServerMaxMoney(this.target)) {
            this.hackState = HackState.Growing;
        } else {
            this.hackState = HackState.Hacking;
        }

        await this.updateLog();

        switch (this.hackState) {
            case HackState.Hacking:
                if (this.batch.totalThreads > 0) {
                    this.hack(this.target);
                } else if (this.batches.length === 0) {
                    await this.crudeHack(this.target);
                }
                break;
            case HackState.Growing:
                if (this.batches.length === 0) {
                    await this.grow(this.target);
                }
                break;
            case HackState.Weakening:
                if (this.batches.length === 0) {
                    await this.weaken(this.target);
                }
                break;
        }
    }

    private async updateLog() {
        this.stats.set('Used BotNet Threads', `${this.totalThreads - this.availableThreads} / ${this.totalThreads}`);
        this.stats.set('Target', this.target);
        this.stats.set('State', this.hackState);
        this.stats.set('# of Batches', this.batches.length);

        const money = `$${this.ns.formatNumber(this.ns.getServerMoneyAvailable(this.target), 0)} / $${this.ns.formatNumber(this.ns.getServerMaxMoney(this.target), 0)}`;

        this.targetStats.set('Money', money);
        this.targetStats.set('Security', `${this.ns.formatNumber(this.ns.getServerSecurityLevel(this.target))} (Min: ${this.ns.formatNumber(this.ns.getServerMinSecurityLevel(this.target), 0)})`);

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
            serverRam -= 32;
        }

        if (serverRam < HACK_SCRIPT_RAM) {
            return 0;
        }

        return Math.floor(serverRam / HACK_SCRIPT_RAM);
    }

    private countAvailableThreadsOnHost(host: string): number {
        let serverRam = this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);
        if (host === 'home') {
            serverRam -= 32;
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
        server.hackDifficulty = server.minDifficulty; // simulate the score being super low
        const player = ns.getPlayer();

        const stealPercent = ns.formulas.hacking.hackPercent(server, player);
        const stealAmount = stealPercent * ns.getServerMaxMoney(target);
        return stealAmount / ns.formulas.hacking.hackTime(server, player);
    }

    private async weaken(target: string) {
        const securityLevelTarget = this.ns.getServerMinSecurityLevel(target);
        let securityLevel = this.ns.getServerSecurityLevel(target);

        let threadsAvailable = this.totalThreads;

        for (const [ host, server ] of this.serverList.botNet) {
            this.ns.scp('hack.js', host, 'home');
            const weakenAmount = this.ns.weakenAnalyze(1, server.cpuCores);
            const threadsNeededToWeaken = Math.ceil((securityLevel - securityLevelTarget) / weakenAmount);
            const threads = Math.min(this.countTotalThreadsOnHost(host), threadsNeededToWeaken);
            this.ns.exec('hack.js', host, {
                threads,
                ramOverride: HACK_SCRIPT_RAM,
            }, 'weaken', target);

            securityLevel -= weakenAmount * threads;
            threadsAvailable -= threads;

            if (threadsAvailable < 1) break;
            if (securityLevel <= securityLevelTarget) break;
        }

        await this.ns.sleep(this.ns.getWeakenTime(target) + 1000);
    }

    private async grow(target: string) {
        const player = this.ns.getPlayer();
        const targetServer = this.ns.getServer(target);
        const maxMoney = this.ns.getServerMaxMoney(target);

        let targetGrowThreads = 1;
        let targetWeakenThreads = 1;
        let maxGrowThreads = this.ns.formulas.hacking.growThreads(targetServer, player, maxMoney);

        for (targetGrowThreads = 1; targetGrowThreads <= maxGrowThreads; targetGrowThreads++) {
            if ((targetGrowThreads + targetWeakenThreads) >= this.totalThreads) {
                targetGrowThreads--;
                break;
            }

            const securityIncrease = this.ns.growthAnalyzeSecurity(targetGrowThreads, target);

            while ((targetGrowThreads + targetWeakenThreads) < this.totalThreads && securityIncrease > this.ns.weakenAnalyze(targetWeakenThreads)) {
                targetWeakenThreads++;

                if ((targetGrowThreads + targetWeakenThreads) >= this.totalThreads) {
                    targetGrowThreads--;
                }
                targetWeakenThreads++;
            }
        }

        for (const [ host, server ] of this.serverList.botNet) {
            this.ns.scp('hack.js', host, 'home');
            let serverThreads = this.countTotalThreadsOnHost(host);

            if (serverThreads > 0 && targetGrowThreads > 0) {
                let threads = Math.min(serverThreads, targetGrowThreads);
                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'grow', target);
                serverThreads -= threads;
                targetGrowThreads -= threads;
            }

            if (serverThreads > 0 && targetWeakenThreads > 0) {
                let threads = Math.min(serverThreads, targetWeakenThreads);
                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', target);
                serverThreads -= threads;
                targetWeakenThreads -= threads;
            }

            if (targetGrowThreads <= 0 && targetWeakenThreads <= 0) {
                break;
            }
        }

        await this.ns.sleep(this.ns.getWeakenTime(target) + 1000);
    }

    private async crudeHack(target: string) {
        const maxMoney = this.ns.getServerMaxMoney(target);

        let threadsAvailable = this.totalThreads;
        let threadsNeeded = Math.ceil(this.ns.hackAnalyzeThreads(target, maxMoney * 0.95));

        for (const [ host, server ] of this.serverList.botNet) {
            const threads = Math.min(this.countTotalThreadsOnHost(host), threadsNeeded);
            this.ns.exec('hack.js', host, {
                threads,
                ramOverride: HACK_SCRIPT_RAM,
            }, 'hack', target);

            threadsNeeded -= threads;
            threadsAvailable -= threads;

            if (threadsAvailable < 1) break;
            if (threadsNeeded < 1) break;
        }

        await this.ns.sleep(this.ns.getHackTime(target) + 1000);
    }

    private hack(target: string) {
        let delayMillis = 0;
        while (this.availableThreads >= this.batch.totalThreads) {
            this.scheduleBatch(this.batch, delayMillis);
            delayMillis += 500;
        }
    }

    private scheduleBatch(batch: Batch, delayMillis: number) {
        const hackTimeAdditional = Math.ceil(this.ns.getWeakenTime(this.target) - this.ns.getHackTime(this.target) - 50);
        const growTimeAdditional = Math.ceil(this.ns.getWeakenTime(this.target) - this.ns.getGrowTime(this.target) - 150);

        let hackThreadsNeeded = batch.hackThreads;
        let growThreadsNeeded = batch.growThreads;
        let weakenThreadsNeeded = batch.weakenThreads;

        for (const [ host, server ] of this.serverList.botNet) {
            let threadsAvailable = this.countAvailableThreadsOnHost(host);

            if (threadsAvailable > 0 && hackThreadsNeeded) {
                const threads = Math.min(threadsAvailable, hackThreadsNeeded);

                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'hack', this.target, delayMillis, hackTimeAdditional);

                threadsAvailable -= threads;
                hackThreadsNeeded -= threads;

            }

            if (threadsAvailable > 0 && growThreadsNeeded > 0) {
                const threads = Math.min(threadsAvailable, growThreadsNeeded);

                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'grow', this.target, delayMillis, growTimeAdditional);

                threadsAvailable -= threads;
                growThreadsNeeded -= threads;

            }

            if (threadsAvailable > 0 && weakenThreadsNeeded > 0) {
                const threads = Math.min(threadsAvailable, weakenThreadsNeeded);

                this.ns.exec('hack.js', host, {
                    threads,
                    ramOverride: HACK_SCRIPT_RAM,
                }, 'weaken', this.target, delayMillis);

                threadsAvailable -= threads;
                weakenThreadsNeeded -= threads;

            }
        }

        this.batches.push(Date.now() + Math.ceil(this.ns.getWeakenTime(this.target)));
        this.availableThreads -= batch.totalThreads;
    }
}

export function calculateOptimalBatch(ns: NS, target: string, threadsAvailable: number): Batch {
    let batch: Batch;
    batch = {
        hackThreads: 0,
        growThreads: 0,
        weakenThreads: 0,
        totalThreads: 0,
    };

    const player = ns.getPlayer();

    for (let totalPercentToSteal = 0.95; totalPercentToSteal > 0; totalPercentToSteal -= 0.05) {
        batch = {
            hackThreads: 0,
            growThreads: 0,
            weakenThreads: 0,
            totalThreads: 0,
        };

        const server = ns.getServer(target);
        const moneyMax = (server.moneyMax ?? -1);

        // Make the server perfect
        server.hackDifficulty = server.minDifficulty;
        server.moneyAvailable = moneyMax;

        if (server.moneyAvailable <= 0) {
            ns.print(`ERROR ${target} has $${moneyMax} available. You probably chose the wrong server on accident`);
            ns.exit();
        }

        const maxHackThreads = Math.floor(threadsAvailable * 0.5);

        const hackPercent = ns.formulas.hacking.hackPercent(server, player);
        const hackAmount = hackPercent * moneyMax;
        batch.hackThreads = Math.min(maxHackThreads, Math.floor((moneyMax * totalPercentToSteal) / hackAmount));

        const totalHackAmount = hackAmount * batch.hackThreads;
        server.moneyAvailable -= totalHackAmount;

        batch.growThreads = Math.ceil(ns.formulas.hacking.growThreads(server, player, moneyMax) * 1.5);

        const totalSecurityIncrease = ns.hackAnalyzeSecurity(batch.hackThreads, target) + ns.growthAnalyzeSecurity(batch.growThreads);
        const weakenAmount = 0.05; // See weaken() docs. Says 0.05 except in unusual cases.
        batch.weakenThreads = Math.ceil(totalSecurityIncrease / weakenAmount);

        batch.totalThreads = batch.hackThreads + batch.growThreads + batch.weakenThreads;

        if (batch.totalThreads <= threadsAvailable) {
            break;
        } else {
            batch = {
                hackThreads: 0,
                growThreads: 0,
                weakenThreads: 0,
                totalThreads: 0,
            };
        }
    }

    return batch;
}

export type Batch = {
    hackThreads: number;
    growThreads: number;
    weakenThreads: number;
    totalThreads: number;
}