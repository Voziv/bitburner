import { NS } from '@ns';
import { ServerList } from '/lib/ServerList';
import { Tools } from '/lib/tools';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


const sleepMillis = 1000;
const HACK_SCRIPT_RAM = 1.6 + 0.2;
const MAX_THREADS = 100;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * 12));
    ns.print("Hacker is booting up, please wait...");

    const hacker = new Hacker(ns);

    while (true) {
        await hacker.tick();
        await ns.sleep(sleepMillis);
    }
}

enum HackState {
    Idle,
    Growing,
    Weakening,
    Hacking,
}

export class Hacker {
    private ns: NS;

    private serverList: ServerList;
    private tools: Tools;

    private target = 'n00dles';
    private hackState: HackState = HackState.Idle;


    private totalThreads = 0;
    private reHack = true;

    private stats = new Map<string, string>();
    private targetStats = new Map<string, string>();
    private hackStats = new Map<string, string>();


    constructor(ns: NS) {
        this.ns = ns;
        this.serverList = new ServerList(ns);
        this.tools = new Tools(ns);
    }

    public async tick() {
        await this.serverList.onTick();
        await this.tools.onTick();

        // Get admin on as many servers as possible.
        for (const [ host, server ] of this.serverList.servers) {
            if (!server.hasAdminRights && this.ns.getServerNumPortsRequired(host) <= this.tools.toolCount) {
                this.tools.openPorts(host);
                this.ns.nuke(host);
            }
        }

        const newTotalThreads = this.countThreads();
        if (newTotalThreads !== this.totalThreads) {
            this.totalThreads = newTotalThreads;
            this.reHack = true;
        }

        const newTarget = this.pickBestTarget();
        if (newTarget !== this.target) {
            this.ns.print(`New target selected: ${newTarget}`);
            this.ns.print(`Hack Level: ${this.ns.getServerRequiredHackingLevel(newTarget)}`);
            this.target = newTarget;
            this.reHack = true;
        }


        if (this.reHack) {
            await this.hackTarget(this.target);
            this.reHack = false;
        }

        await this.updateLog();
    }

    private async updateLog() {
        this.stats.set('Target', this.target);

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

    private countThreads(): number {
        let threads = 0;
        for (const [ host, server ] of this.serverList.servers) {
            threads += this.maxHostThreads(host);
        }

        return threads;
    }

    private maxHostThreads(host: string): number {
        let serverRam = this.ns.getServerMaxRam(host);
        if (host === 'home') {
            serverRam -= 64;
        }

        if (serverRam < HACK_SCRIPT_RAM) {
            return 0;
        }

        return Math.floor(serverRam / HACK_SCRIPT_RAM);
    }

    private pickBestTarget() {
        let target = this.target;

        for (const [ host, server ] of this.serverList.servers) {
            if (host === 'home' || host.startsWith('voz-') || !this.ns.hasRootAccess(host)) {
                continue;
            }

            if (this.ns.hackAnalyzeChance(host) < 0.8) {
                continue;
            }

            if (this.ns.getServerMaxMoney(host) > this.ns.getServerMaxMoney(target)) {
                target = host;
            }
        }

        return target;
    }

    private async hackTarget(target: string) {
        const growParts = 80;
        const weakenParts = 40;
        const hackParts = 1;
        const totalParts = hackParts + growParts + weakenParts;
        const growPercent = growParts / totalParts;
        const weakenPercent = weakenParts / totalParts;
        const hackPercent = hackParts / totalParts;

        const totalThreads = this.countThreads();
        const targetGrowThreads = Math.floor(totalThreads * growPercent);
        const targetWeakenThreads = Math.floor(totalThreads * weakenPercent);
        const targetHackThreads = Math.floor(totalThreads * hackPercent);
        let totalGrowThreads = 0;
        let totalWeakenThreads = 0;
        let totalHackThreads = 0;

        for (const [ host, server ] of this.serverList.servers) {
            let threadsAvailable = this.maxHostThreads(host);
            if (threadsAvailable < 1) continue;


            if (host !== 'home') {
                // TODO: Check hashes and only copy when different?
                this.ns.scp('hack.js', host, 'home');
            }

            this.ns.scriptKill('hack.js', host);

            /**
             * WEAKEN
             */
            while (threadsAvailable > 0) {
                const delay = Math.floor(Math.random() * 400) + 100;
                if (totalWeakenThreads < targetWeakenThreads) {
                    const threads = Math.min(Math.min(threadsAvailable, targetWeakenThreads - totalWeakenThreads), MAX_THREADS);
                    this.ns.exec('hack.js', host, {
                        threads,
                        ramOverride: HACK_SCRIPT_RAM,
                    }, 'weaken-loop', target, delay);
                    totalWeakenThreads += threads;
                    threadsAvailable -= threads;
                } else {
                    break;
                }
            }

            /**
             * GROW
             */
            while (threadsAvailable > 0) {
                const delay = Math.floor(Math.random() * 400) + 100;
                if (totalGrowThreads < targetGrowThreads) {
                    const threads = Math.min(Math.min(threadsAvailable, targetGrowThreads - totalGrowThreads), MAX_THREADS);
                    this.ns.exec('hack.js', host, {
                        threads,
                        ramOverride: HACK_SCRIPT_RAM,
                    }, 'grow-loop', target, delay);
                    totalGrowThreads += threads;
                    threadsAvailable -= threads;
                } else {
                    break;
                }
            }

            /**
             * HACK
             */
            while (threadsAvailable > 0) {
                const delay = Math.floor(Math.random() * 400) + 100;
                if (totalHackThreads < targetHackThreads) {
                    const threads = Math.min(Math.min(threadsAvailable, targetHackThreads - totalHackThreads), MAX_THREADS);
                    this.ns.exec('hack.js', host, {
                        threads,
                        ramOverride: HACK_SCRIPT_RAM,
                    }, 'hack-loop', target, delay);
                    totalHackThreads += threads;
                    threadsAvailable -= threads;
                } else {
                    break;
                }
            }
        }

        this.hackStats.set('Threads', `${this.ns.formatNumber(totalHackThreads + totalGrowThreads + totalWeakenThreads)} / ${this.ns.formatNumber(totalThreads)}`);
        this.hackStats.set('HGW', `${'Hack'.padEnd(8)} / ${'Grow'.padEnd(8)} / ${'Weaken'.padEnd(8)}`);
        this.hackStats.set('H/G/W %', `${(this.ns.formatNumber(hackPercent * 100) + '%').padEnd(8)} / ${(this.ns.formatNumber(growPercent * 100) + '%').padEnd(8)} / ${(this.ns.formatNumber(weakenPercent * 100) + '%').padEnd(8)}`);
        this.hackStats.set('H/G/W Threads', `${this.ns.formatNumber(totalHackThreads, 0).padEnd(8)} / ${this.ns.formatNumber(totalGrowThreads, 0).padEnd(8)} / ${this.ns.formatNumber(totalWeakenThreads, 0).padEnd(8)}`);
    }
}