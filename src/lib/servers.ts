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