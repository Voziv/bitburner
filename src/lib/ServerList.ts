import { NS, Server } from '@ns';


const MAX_SCAN_DEPTH = 25;

export class ServerList {
    private ns: NS;

    private hosts = new Set<string>();
    public servers = new Map<string, Server>();
    private lastHostScan = 0;


    constructor(ns: NS) {
        this.ns = ns;
        this.lastHostScan = Date.now();
        this.getHosts('home', 0);
    }

    public async onTick() {
        const now = Date.now();
        if (this.lastHostScan <= now - 60000) {
            this.lastHostScan = now;
            this.getHosts('home', 0);
        }

        for (const host of this.hosts) {
            this.servers.set(host, this.ns.getServer(host));
        }
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