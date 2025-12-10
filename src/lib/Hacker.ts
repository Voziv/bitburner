import {NS} from '@ns';
import {ServerList} from '/lib/ServerList';
import {Tools} from '/lib/tools';
import {PurchasedServers} from '/lib/PurchasedServers';
import {printStats} from "/lib/format";

const HACK_SCRIPT_RAM = 1.6 + 0.2;
const MAX_THREADS = 100;

export class Hacker {
    private ns: NS;

    private serverList: ServerList;
    private tools: Tools;
    private purchasedServers: PurchasedServers;
    private target = 'n00dles';
    private totalThreads = 0;
    private reHack = true;
    private stats = new Map<string, string>();
    private targetStats = new Map<string, string>();
    private hackStats = new Map<string, string>();

    constructor(ns: NS) {
        this.ns = ns;
        this.serverList = new ServerList(ns);
        this.tools = new Tools(ns);
        this.purchasedServers = new PurchasedServers(ns);
    }

    private async updateStats() {
        this.ns.clearLog();
        this.stats.set('Timestamp', `${Date.now()}`)
        this.stats.set('PServ #', `${this.purchasedServers.purchasedCount}`)
        this.stats.set('PServ #', `${this.ns.formatRam(this.purchasedServers.currentRam, 0)} -> ${this.ns.formatRam(this.purchasedServers.upgradeRam, 0)}`)
        this.stats.set('Upgrade Progress', `${this.purchasedServers.upgradedCount} / ${this.purchasedServers.purchasedCount}`)
        printStats(this.ns, this.stats);
        this.targetStats.set('Target', this.target)
        this.targetStats.set('Money', `$${this.ns.formatNumber(this.ns.getServerMoneyAvailable(this.target), 0)} / $${this.ns.formatNumber(this.ns.getServerMaxMoney(this.target), 0)}`)
        this.targetStats.set('Security', `${this.ns.formatNumber(this.ns.getServerSecurityLevel(this.target))} (Min: ${this.ns.formatNumber(this.ns.getServerMinSecurityLevel(this.target), 0)})`)
        this.targetStats.set('Hack Analyze', this.ns.formatNumber(this.ns.hackAnalyze(this.target)))
        this.targetStats.set('Hack Analyze %', this.ns.formatNumber(this.ns.hackAnalyzeChance(this.target) * 100) + '%')
        this.targetStats.set('Hack Analyze Threads', this.ns.formatNumber(this.ns.hackAnalyzeThreads(this.target, this.ns.getServerMaxMoney(this.target) - 1)))
        this.targetStats.set('Server Growth', this.ns.formatNumber(this.ns.getServerGrowth(this.target)))
        this.targetStats.set('Hack Time', this.ns.tFormat(this.ns.getHackTime(this.target)))
        this.targetStats.set('Weak Time', this.ns.tFormat(this.ns.getWeakenTime(this.target)))
        this.targetStats.set('Weak Amt', this.ns.formatNumber(this.ns.weakenAnalyze(1)))
        this.targetStats.set('---', '---')

        this.targetStats.set('Grow Time', this.ns.tFormat(this.ns.getGrowTime(this.target)))
        this.targetStats.set('Grow Security Amt', this.ns.formatNumber(this.ns.growthAnalyzeSecurity(1, this.target)))

        printStats(this.ns, this.targetStats)
        printStats(this.ns, this.hackStats)
    }

    public async run() {
        while (true) {

            await this.purchasedServers.onTick();
            await this.serverList.onTick();
            await this.tools.onTick();

            // Get admin on as many servers as possible.
            for (const [host, server] of this.serverList.servers) {
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
            // const newTarget = this.target = 'phantasy';
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

            await this.updateStats();
            await this.ns.sleep(1000);
        }
    }

    private countThreads(): number {
        let threads = 0;
        for (const [host, server] of this.serverList.servers) {
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

        for (const [host, server] of this.serverList.servers) {
            if (host === 'home' || host.startsWith('voz-') || !server.hasAdminRights) {
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

        this.hackStats.set('Grow %', `${this.ns.formatNumber(growPercent * 100, 1)}%`)
        this.hackStats.set('Weaken %', `${this.ns.formatNumber(weakenPercent * 100, 1)}%`)
        this.hackStats.set('Hack %', `${this.ns.formatNumber(hackPercent * 100, 1)}%`)
        this.hackStats.set('= =', '')
        this.hackStats.set('Total threads available', `${this.ns.formatNumber(totalThreads, 0)}`)
        this.hackStats.set(' ==', '')
        this.hackStats.set('Desired Grow Threads', `${this.ns.formatNumber(targetGrowThreads, 0)}`)
        this.hackStats.set('Desired Weaken Threads', `${this.ns.formatNumber(targetWeakenThreads, 0)}`)
        this.hackStats.set('Desired Hack Threads', `${this.ns.formatNumber(targetHackThreads, 0)}`)


        for (const [host, server] of this.serverList.servers) {
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
                const delay = Math.floor(Math.random() * 400) + 100
                if (totalWeakenThreads < targetWeakenThreads) {
                    const threads = Math.min(Math.min(threadsAvailable, targetWeakenThreads - totalWeakenThreads), MAX_THREADS);
                    this.ns.exec('hack.js', host, {
                        threads,
                        ramOverride: HACK_SCRIPT_RAM
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
                const delay = Math.floor(Math.random() * 400) + 100
                if (totalGrowThreads < targetGrowThreads) {
                    const threads = Math.min(Math.min(threadsAvailable, targetGrowThreads - totalGrowThreads), MAX_THREADS);
                    this.ns.exec('hack.js', host, {
                        threads,
                        ramOverride: HACK_SCRIPT_RAM
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
                const delay = Math.floor(Math.random() * 400) + 100
                if (totalHackThreads < targetHackThreads) {
                    const threads = Math.min(Math.min(threadsAvailable, targetHackThreads - totalHackThreads), MAX_THREADS);
                    this.ns.exec('hack.js', host, {
                        threads,
                        ramOverride: HACK_SCRIPT_RAM
                    }, 'hack-loop', target, delay);
                    totalHackThreads += threads;
                    threadsAvailable -= threads;
                } else {
                    break;
                }
            }
        }

        this.hackStats.set(' = =', '')
        this.hackStats.set('Total Grow Threads', `${this.ns.formatNumber(totalGrowThreads, 0)}`)
        this.hackStats.set('Total Weaken Threads', `${this.ns.formatNumber(totalWeakenThreads, 0)}`)
        this.hackStats.set('Total Hack Threads', `${this.ns.formatNumber(totalHackThreads, 0)}`)
        this.hackStats.set('= = ', '')
        this.hackStats.set(`Grow   Time for ${target}`, `${this.ns.tFormat(this.ns.getGrowTime(target))}`)
        this.hackStats.set(`Weaken Time for ${target}`, `${this.ns.tFormat(this.ns.getWeakenTime(target))}`)
        this.hackStats.set(`Hack   Time for ${target}`, `${this.ns.tFormat(this.ns.getHackTime(target))}`)
    }
}