import {NS} from '@ns';
import {Host, Hosts, scan} from '/lib/servers';


export async function main(ns: NS): Promise<void> {
    const target = 'run4theh111z';
    ns.tprint(`Searching for ${target}`);
    ns.disableLog('ALL');
    ns.clearLog();
    const hosts: Hosts = {};

    await scan(ns, 'home', hosts, 11);

    let server = hosts[target];
    if (!server) {
        ns.tprint(`Could not find ${target}`);
        ns.exit();
    }

    for (let i = 0; i < 50; i++) {
        ns.tprint(server.name)
        if (server.parent) {
            server = hosts[server.parent];
        } else {
            break;
        }
    }
}