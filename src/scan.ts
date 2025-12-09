import {NS} from '@ns';
import {Host, Hosts, scan} from '/lib/servers';



export async function main(ns: NS): Promise<void> {

    const hosts: Hosts = {};

    await scan(ns, 'home', hosts, 1);
    const sortedHosts = Object.values(hosts).sort((a: Host, b: Host) => {
        if (a.portsRequired === b.portsRequired) {
            if (a.hackLevel === b.hackLevel) {
                if (a.maxMoney === b.maxMoney) {
                    return a.name.localeCompare(b.name);
                }
                return a.maxMoney - b.maxMoney;
            }
            return a.hackLevel - b.hackLevel;
        }
        return a.portsRequired - b.portsRequired;
    });

    ns.tprint(`Found ${Object.keys(hosts).length} hosts`);
    printHosts(ns, sortedHosts);
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
        if (lastPorts < host.portsRequired){
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