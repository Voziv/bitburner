import {NS} from '@ns';
import {ServerList} from '/lib/ServerList';
import {Tools} from '/lib/tools';
import {PurchasedServers} from '/lib/PurchasedServers';

export class Hacker {
    private ns: NS;

    private serverList: ServerList;
    private tools: Tools;
    private purchasedServers: PurchasedServers;
    private target = 'n00dles';
    private totalThreads = 0;
    private reHack = true;

    constructor(ns: NS) {
        this.ns = ns;
        this.serverList = new ServerList(ns);
        this.tools = new Tools(ns);
        this.purchasedServers = new PurchasedServers(ns);

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

            //const newTarget = this.pickBestTarget();
            const newTarget = this.target = 'iron-gym';
            if (newTarget !== this.target) {
                this.ns.print(`New target selected: ${newTarget}`);
                this.ns.print(`Hack Level: ${this.ns.getServerRequiredHackingLevel(newTarget)}`);
                this.target = newTarget;
                this.reHack = true;
            }


            if (this.reHack) {
                this.hackTarget(this.target);
                this.reHack = false;
            }

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
        const scriptRam = this.ns.getScriptRam('grow.js', 'home');
        let serverRam = this.ns.getServerMaxRam(host);
        if (host === 'home') {
            serverRam -= 64;
        }

        if (serverRam < scriptRam) {
            return 0;
        }

        return Math.floor(serverRam / scriptRam);
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

    private hackTarget(target: string) {
        const growParts = 20;
        const weakenParts = 4;
        const hackParts = 1;
        const totalParts = hackParts + growParts + weakenParts;
        const growPercent = growParts / totalParts;
        const weakenPercent = weakenParts / totalParts;
        const hackPercent = hackParts / totalParts;

        this.ns.print(`Grow %: ${growPercent * 100}%`);
        this.ns.print(`Weaken %: ${weakenPercent * 100}%`);
        this.ns.print(`Hack %: ${hackPercent * 100}%`);


        const totalThreads = this.countThreads();
        const targetGrowThreads = Math.floor(totalThreads * growPercent);
        const targetWeakenThreads = Math.floor(totalThreads * weakenPercent);
        const targetHackThreads = Math.floor(totalThreads * hackPercent);
        let totalGrowThreads = 0;
        let totalWeakenThreads = 0;
        let totalHackThreads = 0;

        this.ns.print(`Grow %                 : ${this.ns.formatNumber(growPercent * 100, 1)}%`);
        this.ns.print(`Weaken %               : ${this.ns.formatNumber(weakenPercent * 100, 1)}%`);
        this.ns.print(`Hack %                 : ${this.ns.formatNumber(hackPercent * 100, 1)}%`);
        this.ns.print('========================================');
        this.ns.print(`Total threads available: ${this.ns.formatNumber(totalThreads, 0)}`);
        this.ns.print('========================================');
        this.ns.print(`Desired Grow Threads   : ${this.ns.formatNumber(targetGrowThreads, 0)}`);
        this.ns.print(`Desired Weaken Threads : ${this.ns.formatNumber(targetWeakenThreads, 0)}`);
        this.ns.print(`Desired Hack Threads   : ${this.ns.formatNumber(targetHackThreads, 0)}`);

        for (const [host, server] of this.serverList.servers) {
            if (host !== 'home') {
                this.ns.scp('grow.js', host, 'home');
                this.ns.scp('weaken.js', host, 'home');
                this.ns.scp('hack.js', host, 'home');
            }

            this.ns.killall(host);

            let threadsAvailable = this.maxHostThreads(host);

            // Do we need grow threads?
            if (threadsAvailable > 0 && totalGrowThreads < targetGrowThreads) {
                const threads = Math.min(threadsAvailable, targetGrowThreads - totalGrowThreads);
                this.ns.exec('grow.js', host, threads, target);
                totalGrowThreads += threads;
                threadsAvailable -= threads;
            }

            // Do we need weaken threads?
            if (threadsAvailable > 0 && totalWeakenThreads < targetWeakenThreads) {
                const threads = Math.min(threadsAvailable, targetWeakenThreads - totalWeakenThreads);
                this.ns.exec('weaken.js', host, threads, target);
                totalWeakenThreads += threads;
                threadsAvailable -= threads;
            }

            // Do we need hack threads?
            if (threadsAvailable > 0 && totalHackThreads < targetHackThreads) {
                const threads = Math.min(threadsAvailable, targetHackThreads - totalHackThreads);
                this.ns.exec('hack.js', host, threads, target);
                totalHackThreads += threads;
                threadsAvailable -= threads;
            }
        }

        this.ns.print('========================================');
        this.ns.print(`Total Grow Threads     : ${this.ns.formatNumber(totalGrowThreads, 0)}`);
        this.ns.print(`Total Weaken Threads   : ${this.ns.formatNumber(totalWeakenThreads, 0)}`);
        this.ns.print(`Total Hack Threads     : ${this.ns.formatNumber(totalHackThreads, 0)}`);
        this.ns.print('========================================');
        this.ns.print(`Grow   Time for ${target}: ${this.ns.tFormat(this.ns.getGrowTime(target))}`);
        this.ns.print(`Weaken Time for ${target}: ${this.ns.tFormat(this.ns.getWeakenTime(target))}`);
        this.ns.print(`Hack   Time for ${target}: ${this.ns.tFormat(this.ns.getHackTime(target))}`);
    }
}