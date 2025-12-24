import { NS } from '@ns';
import { countTools, useTools } from '/lib/tools';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


const WINDOW_WIDTH = 600;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * 12));
    ns.clearLog();

    const hosts: Hosts = {};
    scan(ns, 'home', hosts, 1);

    await backdoor(ns, 'CSEC', hosts);
    await backdoor(ns, 'avmnite-02h', hosts);
    await backdoor(ns, 'I.I.I.I', hosts);
    await backdoor(ns, 'run4theh111z', hosts);


    await backdoor(ns, 'The-Cave', hosts);
    await backdoor(ns, 'w0r1d_d43m0n', hosts);

}

function canHack(ns: NS, host: string): boolean {
    if (!ns.serverExists(host)) {
        return false;
    }
    const server = ns.getServer(host);
    const player = ns.getPlayer();
    if (server.requiredHackingSkill > player.skills.hacking) {
        return false;
    }

    if (server.numOpenPortsRequired > countTools(ns)) {
        return false;
    }

    if (!server.hasAdminRights) {
        useTools(ns, host);
    }

    return true;
}

async function backdoor(ns: NS, target: string, hosts: Hosts) {
    let server = hosts[target];
    if (!server) {
        ns.print(`ERROR: ${target} does not exist`);
        return;
    }

    if (ns.getServer(target).backdoorInstalled) {
        ns.print(`${target} already has a backdoor.`);
        return;
    }

    if (!canHack(ns, target)) {
        ns.print(`Requirements for installing a backdoor on ${target} not met yet.`);
        return;
    }


    ns.print(`Installing a backdoor to ${target}.`);

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
            ns.print(`Failed to connect to ${path} from ${currentHost}`);
        }
        if (currentHost === target) {
            await ns.singularity.installBackdoor();
        }
    }

    ns.singularity.connect('home');
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