import {NS} from '@ns';
import {Host, Hosts, scan} from '/lib/servers';
import {formatAsTable} from "/lib/table";


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    while (true) {
        ns.clearLog();
        const host: string = ns.args[0].valueOf() as string;

        const serverData: Map<string, string> = new Map<string, string>();

        serverData.set('Hostname', host)
        serverData.set('Cur Money', '$' + ns.formatNumber(ns.getServerMoneyAvailable(host), 0))
        serverData.set('Max Money', '$' + ns.formatNumber(ns.getServerMaxMoney(host), 0))
        serverData.set('Min Security', ns.formatNumber(ns.getServerMinSecurityLevel(host)))
        serverData.set('Cur Security', ns.formatNumber(ns.getServerSecurityLevel(host)))

        // const money = ns.getServerMoneyAvailable(host)
        // const maxMoney = ns.getServerMaxMoney(host)
        // const maxRam = ns.getServerMaxRam(host)
        // const portsRequired = ns.getServerNumPortsRequired(host)
        // const hackLevel = ns.getServerRequiredHackingLevel(host)

        formatAsTable(ns, Array.from(serverData.keys()), [Array.from(serverData.values())])

        await ns.sleep(1000);
    }
}

function printHosts(ns: NS, hosts: Host[]) {
    const moneyFormatter = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
    const padding = [
        20, 5, 10, 18, 18, 10, 10,
    ];
    const totalPadding = padding.reduce((acc, val) => acc + val) + ((padding.length - 1) * 3) + 4;
    ns.tprintf('| %s | %s | %s | %s | %s | %s | %s |',
        'Name'.padEnd(padding[0]),
        'Depth'.padEnd(padding[1]),
        'Hack Level'.padEnd(padding[2]),
        'Cur Money'.padEnd(padding[3]),
        'Max Money'.padEnd(padding[4]),
        'Max Ram'.padEnd(padding[5]),
        '# Ports'.padEnd(padding[6]),
    );

    ns.tprintf(''.padEnd(totalPadding, '='));
    let lastPorts = 0;
    for (const host of Object.values(hosts)) {
        if (lastPorts < host.portsRequired) {
            ns.tprintf(''.padEnd(totalPadding, '='));
            lastPorts = host.portsRequired;
        }
        ns.tprintf('| %s | %s | %s | %s | %s | %s | %s |',
            host.name.padEnd(padding[0]),
            ns.sprintf('%d', host.depth).padEnd(padding[1]),
            ns.sprintf('%d', host.hackLevel).padEnd(padding[2]),
            moneyFormatter.format(host.currentMoney).padEnd(padding[3]),
            moneyFormatter.format(host.maxMoney).padEnd(padding[4]),
            ns.sprintf('%d GB', host.maxRam).padEnd(padding[5]),
            ns.sprintf('%d', host.portsRequired).padEnd(padding[6]),
        );
    }
}