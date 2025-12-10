import {NS, Server} from '@ns';

const MAX_SCAN_DEPTH = 25;

export class ServerList {
    private ns: NS;

    private hosts = new Set<string>();
    public servers = new Map<string, Server>();


    constructor(ns: NS) {
        this.ns = ns;
    }

    public async onTick() {
        await this.getHosts('home', 0);

        for (const host of this.hosts) {
            this.servers.set(host, this.ns.getServer(host));
        }
    }

    private async getHosts(hostToScan: string, depth: number) {
        await this.ns.sleep(1);
        this.hosts.add(hostToScan);

        if (depth > MAX_SCAN_DEPTH) {
            return;
        }

        const hosts = this.ns.scan(hostToScan);
        for (const host of hosts) {
            if (this.hosts.has(host)) {
                continue;
            }

            await this.getHosts(host, depth + 1);
        }

    }
}