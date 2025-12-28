import { AutocompleteData, NS } from '@ns';


export function autocomplete(data: AutocompleteData, args: string[]) {
    return [ ...data.servers ];
}

export async function main(ns: NS): Promise<void> {
    const host = ns.args[0] as string;

    const hosts: Hosts = {};
    scan(ns, 'home', hosts, 1);

    await connect(ns, host, hosts);

}

async function connect(ns: NS, target: string, hosts: Hosts) {
    let server = hosts[target];
    if (!server) {
        ns.tprint(`ERROR: ${target} does not exist`);
        return;
    }

    if (ns.getServer(target).backdoorInstalled) {
        ns.singularity.connect(target);
        return;
    }

    const paths: string[] = [];

    for (let i = 0; i < 50; i++) {
        paths.push(server.name);
        if (server.parent) {
            if (server.parent === 'home') {
                break;
            }

            server = hosts[server.parent];
        } else {
            break;
        }
    }

    // Always start from home.
    ns.singularity.connect('home');

    for (const path of paths.reverse()) {
        const currentHost = ns.singularity.getCurrentServer();
        if (!ns.singularity.connect(path)) {
            ns.tprint(`Failed to connect to ${path} from ${currentHost}`);
        }
        if (currentHost === target) {
            await ns.singularity.installBackdoor();
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