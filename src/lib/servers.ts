import { NS, Server } from '@ns';


export type Host = {
    name: string;
    hackLevel: number;
    currentMoney: number;
    maxMoney: number;
    maxRam: number;
    portsRequired: number;
    depth: number;
    parent?: string;
    children: string[];
}

export type Hosts = {
    [name: string]: Host;
}

export function upgradeServer(ns: NS, target: string) {
    if (ns.fileExists('BruteSSH.exe', 'home')) {
        ns.brutessh(target);
    }
    if (ns.fileExists('FTPCrack.exe', 'home')) {
        ns.ftpcrack(target);
    }
    if (ns.fileExists('relaySMTP.exe', 'home')) {
        ns.relaysmtp(target);
    }
    if (ns.fileExists('HTTPWorm.exe', 'home')) {
        ns.httpworm(target);
    }
    if (ns.fileExists('SQLInject.exe', 'home')) {
        ns.sqlinject(target);
    }
}

const HOSTS = new Set<string>();
const SERVERS = new Map<string, Server>();

export async function getServers(ns: NS) {
    for (const host of HOSTS) {
        SERVERS.set(host, ns.getServer(host));
    }

}

export async function getHosts(ns: NS, hostToScan: string, depth: number) {
    await ns.sleep(1);

    if (depth > 25) {
        return;
    }

    const hosts = ns.scan(hostToScan);
    for (const host of hosts) {
        if (HOSTS.has(host)) {
            continue;
        }
        HOSTS.add(host);
        await getHosts(ns, host, depth + 1);
    }

}

export async function scan(ns: NS, host: string, hosts: Hosts, depth: number) {
    // Ensure we provide the ability for other scripts to run
    await ns.sleep(1);

    if (depth > 25) {
        return;
    }

    const results = ns.scan(host);

    for (const result of results) {
        if (result == 'home' || Object.hasOwn(hosts, result)) {
            continue;
        }

        hosts[result] = {
            name: result,
            currentMoney: ns.getServerMoneyAvailable(result),
            maxMoney: ns.getServerMaxMoney(result),
            maxRam: ns.getServerMaxRam(result),
            portsRequired: ns.getServerNumPortsRequired(result),
            hackLevel: ns.getServerRequiredHackingLevel(result),
            parent: host,
            children: results.filter((value) => value === host),
            depth,
        };
        await scan(ns, result, hosts, depth + 1);
    }
}