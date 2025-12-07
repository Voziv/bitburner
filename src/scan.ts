import {NS} from '@ns';

type Host = {
    name: string;
    hackLevel: number;
    maxMoney: number;
    maxRam: number;
    portsRequired: number;
    depth: number;
}

type Hosts = {
    [name: string]: Host;
}

const MAX_DEPTH = 25;

export async function main(ns: NS): Promise<void> {

    const hosts: Hosts = {};

    await scan(ns, 'home', hosts, 1);
    const sortedHosts = Object.values(hosts).sort((a: Host, b: Host) => {
        if (a.depth === b.depth) {
            return a.name.localeCompare(b.name);
        }
        return a.depth - b.depth;
    });

    ns.tprint(`Found ${Object.keys(hosts).length} hosts`);
    printHosts(ns, sortedHosts);
}

function printHosts(ns: NS, hosts: Host[]) {
    const moneyFormatter = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
    const padding = [
        20, 5, 10, 18, 10, 10,
    ];
    const totalPadding = padding.reduce((acc, val) => acc + val) + ((padding.length - 1) * 3) + 4;
    ns.tprintf('| %s | %s | %s | %s | %s | %s |',
        'Name'.padEnd(padding[0]),
        'Depth'.padEnd(padding[1]),
        'Hack Level'.padEnd(padding[2]),
        'Max Money'.padEnd(padding[3]),
        'Max Ram'.padEnd(padding[4]),
        '# Ports'.padEnd(padding[5]),
    );

    ns.tprintf(''.padEnd(totalPadding, '='));
    for (const host of Object.values(hosts)) {
        ns.tprintf('| %s | %s | %s | %s | %s | %s |',
            host.name.padEnd(padding[0]),
            ns.sprintf('%d', host.depth).padEnd(padding[1]),
            ns.sprintf('%d', host.hackLevel).padEnd(padding[2]),
            moneyFormatter.format(host.maxMoney).padEnd(padding[3]),
            ns.sprintf('%d GB', host.maxRam).padEnd(padding[4]),
            ns.sprintf('%d', host.portsRequired).padEnd(padding[5]),
        );
    }
}

async function scan(ns: NS, host: string, hosts: Hosts, depth: number) {
    // Ensure we provide the ability for other scripts to run
    await ns.sleep(1);

    if (depth > MAX_DEPTH) {
        return;
    }

    const results = ns.scan(host);
    for (const result of results) {
        if (result.startsWith('hacker-') || result == 'home' || Object.hasOwn(hosts, result)) {
            continue;
        }
        hosts[result] = {
            name: result,
            maxMoney: ns.getServerMaxMoney(result),
            maxRam: ns.getServerMaxRam(result),
            portsRequired: ns.getServerNumPortsRequired(result),
            hackLevel: ns.getServerRequiredHackingLevel(result),
            depth,
        };
        await scan(ns, result, hosts, depth + 1);
    }
}
