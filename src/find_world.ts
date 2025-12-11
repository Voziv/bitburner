import { NS } from '@ns';
import { Host, Hosts, scan } from '/lib/servers';


export async function main(ns: NS): Promise<void> {
    const target = 'w0r1d_d43m0n';
    ns.tprint(`Searching for ${target}`);
    ns.disableLog('ALL');
    ns.clearLog();
    const hosts: Hosts = {};

    await scan(ns, 'home', hosts, 1);

    let server = hosts[target];
    if (!server) {
        ns.tprint(`Could not find ${target}`);
        ns.exit();
    }

    for (let i = 0; i < 50; i++) {

        ns.tprint(server.name);
        if (server.parent) {
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