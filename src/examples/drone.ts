import { NS } from '@ns';
import { tFormatAsTable } from '/lib/table';


export async function main(ns: NS): Promise<void> {
    const hosts = ns.getPurchasedServers();

    const headers = [
        'Host',
        'Memory',
        'Memory Upgrade',
        'Upgrade Cost',
    ];

    const rows: string[][] = [];

    for (const host of hosts) {
        rows.push([
            host,
            ns.formatRam(ns.getServerMaxRam(host)),
            ns.formatRam(ns.getServerMaxRam(host) * 2),
            '$' + ns.formatNumber(ns.getPurchasedServerUpgradeCost(host, ns.getServerMaxRam(host) * 2)),
        ]);
    }

    tFormatAsTable(ns, headers, rows);
}