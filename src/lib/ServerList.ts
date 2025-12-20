import { NS, Server } from '@ns';
import { Tools } from '/lib/tools';


const MAX_SCAN_DEPTH = 25;

export class ServerList {
    private readonly ns: NS;
    private readonly tools: Tools;
    private readonly hosts = new Set<string>();

    public readonly servers = new Map<string, Server>();
    public readonly purchasedServers = new Map<string, Server>();
    public readonly botNet = new Map<string, Server>();

    private lastUpdate = 0;

    constructor(ns: NS) {
        this.ns = ns;
        this.tools = new Tools(ns);
        this.lastUpdate = Date.now();
        this.tools.onTick();
        this.refreshServers();
    }

    public async onTick() {
        const now = Date.now();
        if (this.lastUpdate <= now - 10000) {
            this.lastUpdate = now;
            this.tools.onTick();
            this.refreshServers();
        }
    }

    public getLastUpdate() {
        return this.lastUpdate;
    }

    private refreshServers() {
        this.servers.clear();
        this.purchasedServers.clear();
        this.botNet.clear();

        this.getHosts('home');

        for (const host of this.hosts) {
            const server = this.ns.getServer(host);
            if (!server.hasAdminRights && this.ns.getServerNumPortsRequired(host) <= this.tools.toolCount) {
                this.tools.openPorts(host);
                this.ns.nuke(host);
            }

            this.servers.set(host, server);

            if (server.purchasedByPlayer) {
                this.purchasedServers.set(host, server);
            } else if (this.purchasedServers.has(host)) {
                this.purchasedServers.delete(host);
            }

            if (server.hasAdminRights && server.maxRam >= 2) {
                this.botNet.set(host, server);
            } else if (this.botNet.has(host)) {
                this.botNet.delete(host);
            }
        }
    }

    private getHosts(hostToScan: string, depth = 0) {
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