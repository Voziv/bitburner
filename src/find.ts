import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {

    ns.disableLog('ALL');
    ns.clearLog();
    const hosts: Hosts = {};
    scan(ns, 'home', hosts, 1);


    find(ns, 'run4theh111z', hosts);
    ns.tprint(`-----------------------`);
    ns.tprint(`Searching for w0r1d_d43m0n. It'll be connected to The-Cave`);
    ns.tprint(`-----------------------`);
    find(ns, 'The-Cave', hosts);
}

function find(ns: NS, target: string, hosts: Hosts) {
    ns.tprint(`-----------------------`);
    ns.tprint(`Searching for ${target}`);
    ns.tprint(`-----------------------`);

    let server = hosts[target];
    if (!server) {
        ns.tprint(`Could not find ${target}`);
        return;
    }

    for (let i = 0; i < 50; i++) {
        ns.tprint(server.name);
        if (server.parent) {
            if (server.parent === 'home') {
                ns.tprint(`home`);
                break;
            }
            if (!hosts[server.parent]) {
                ns.tprint(`Could not find ${server.parent}`);
                break;
            }
            server = hosts[server.parent];
        } else {
            break;
        }
    }
}

function scan(ns: NS, host: string, hosts: Hosts, depth: number) {
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
            portsRequired: ns.getServerNumPortsRequired(result),
            hackLevel: ns.getServerRequiredHackingLevel(result),
            parent: host,
            children: results.filter((value) => value === host),
            depth,
        };
        scan(ns, result, hosts, depth + 1);
    }
}

type Host = {
    name: string;
    hackLevel: number;
    portsRequired: number;
    depth: number;
    parent?: string;
    children: string[];
}

type Hosts = {
    [name: string]: Host;
}