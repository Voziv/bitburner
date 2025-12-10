import {NS} from '@ns';
import {Host, Hosts, scan} from '/lib/servers';
import {tFormatAsTable} from "/lib/table";


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.clearLog();
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
    const headers = [
        'Name',
        'Depth',
        'Hack Level',
        'Cur Money',
        'Max Money',
        'Max Ram',
        '# Ports',
    ];

    const data: string[][] = [];

    for (const host of Object.values(hosts)) {
        data.push([
            host.name,
            ns.formatNumber(host.depth, 0),
            ns.formatNumber(host.hackLevel, 0),
            '$' + ns.formatNumber(host.currentMoney, 0),
            '$' + ns.formatNumber(host.maxMoney, 0),
            ns.formatRam(host.maxRam, 0),
            ns.formatNumber(host.portsRequired, 0),
        ]);
    }
    tFormatAsTable(ns, headers, data);
}