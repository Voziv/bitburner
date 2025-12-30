import { NS } from '@ns';
import { getAllServers } from '/lib/servers';
import { countTools, useTools } from '/lib/tools';


/**
 * Crawl and nuke all possible servers.
 */
export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.clearLog();

    const hosts = getAllServers(ns);

    for (const host of hosts) {
        if (ns.hasRootAccess(host)) continue;
        if (ns.getServerNumPortsRequired(host) > countTools(ns)) continue;

        useTools(ns, host);
        ns.nuke(host);
    }
}

