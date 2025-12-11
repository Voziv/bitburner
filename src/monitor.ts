import { NS, Server } from '@ns';
import { formatAsTable } from '/lib/table';
import { printStats } from '/lib/format';


const sleepMillis = 1000;
const MAX_SCAN_DEPTH = 25;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    const titleHeight = 33;
    const lineHeight = 23.5;
    ns.ui.openTail();
    ns.ui.resizeTail(600, titleHeight + (lineHeight * 5));

    const monitor = new Monitor(ns, ns.args[0] as string ?? 'n00dles');

    while (true) {
        await monitor.tick();
        await ns.sleep(sleepMillis);
    }
}


export class Monitor {
    private ns: NS;
    private target: string;

    private hosts = new Set<string>();
    public servers = new Map<string, Server>();
    private lastHostScan = 0;

    private lastTick: number = Date.now();
    private tickStart: number = Date.now();

    private stats = new Map<string, string>();


    constructor(ns: NS, target: string) {
        this.ns = ns;
        this.target = target;
        this.lastHostScan = Date.now();
        this.getHosts('home', 0);
        for (const host of this.hosts) {
            this.servers.set(host, this.ns.getServer(host));
        }
    }

    public async tick() {
        this.lastTick = this.tickStart;
        this.tickStart = Date.now();

        if (this.lastHostScan <= this.tickStart - 60000) {
            // this.lastHostScan = this.tickStart;
            // this.getHosts('home', 0);
            // for (const host of this.hosts) {
            //     this.servers.set(host, this.ns.getServer(host));
            // }
        }

        await this.updateLog();
    }

    private async updateLog() {
        const now = new Date();
        const tickTime = Date.now() - this.tickStart;
        const tickDelay = this.tickStart - this.lastTick;

        this.stats.set('Time', `${now.toLocaleTimeString()} - TickTime: ${tickTime}ms - TickDelay: ${tickDelay}ms`);
        this.stats.set('Target', this.target);

        const target = this.servers.get(this.target);
        this.stats.set('Has Admin', target?.hasAdminRights ? 'Yes' : 'No');
        this.stats.set('Has Root', this.ns.hasRootAccess(this.target) ? 'Yes' : 'No');
        this.stats.set('Money', `$${this.ns.formatNumber(target?.moneyAvailable ?? -1)} / $${this.ns.formatNumber(target?.moneyMax ?? -1)}`);

        this.ns.clearLog();
        this.ns.ui.setTailTitle(`Monitoring ${this.target}`);

        printStats(this.ns, this.stats);
        this.ns.ui.renderTail();
    }

    private getHosts(hostToScan: string, depth: number) {
        this.hosts.add(hostToScan);

        if (depth > MAX_SCAN_DEPTH) return;

        const hosts = this.ns.scan(hostToScan);
        for (const host of hosts) {
            if (this.hosts.has(host)) {
                continue;
            }

            this.getHosts(host, depth + 1);
        }

    }
}