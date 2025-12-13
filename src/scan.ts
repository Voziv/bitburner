import { NS } from '@ns';
import { Host, Hosts, scan } from '/lib/servers';
import { tFormatAsTable } from '/lib/table';
import { ServerList } from '/lib/ServerList';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.clearLog();

    const serverList = new ServerList(ns);
    await serverList.onTick();

    const headers = [
        'Name',
        'Hack Level',
        'Max $',
        'Server Growth',
        'Hack %',
        'Hack Steal %',
        'Hack Steal $', // At max money
        // 'Hack Time',
        // 'Grow Time',
        // 'Weaken Time',
        'Hack / Weaken Time',
        'Grow / Weaken Time',
    ];

    const servers = Array.from(serverList.servers.values())
        .filter(server => !server.hostname.startsWith('voz-'))
        .filter(server => server.hasAdminRights)
        .filter(server => server.moneyMax)
        .filter(server => ns.getHackingLevel() > ns.getServerRequiredHackingLevel(server.hostname));

    const data: string[][] = [];
    for (const server of servers) {
        data.push([
            server.hostname,
            ns.formatNumber(server.requiredHackingSkill ?? 0, 0),
            '$' + ns.formatNumber(server.moneyMax ?? -1, 0),
            ns.formatNumber(server.serverGrowth ?? -1, 0),
            ns.formatNumber(ns.hackAnalyzeChance(server.hostname) * 100, 0) + '%',
            ns.formatNumber(ns.hackAnalyze(server.hostname) * 100) + '%',
            '$' + ns.formatNumber(ns.hackAnalyze(server.hostname) * ns.getServerMaxMoney(server.hostname), 2),
            // ns.tFormat(ns.getHackTime(server.hostname)),
            // ns.tFormat(ns.getGrowTime(server.hostname)),
            // ns.tFormat(ns.getWeakenTime(server.hostname)),
            ns.formatNumber(ns.getHackTime(server.hostname) / ns.getWeakenTime(server.hostname) * 100) + '%',
            ns.formatNumber(ns.getGrowTime(server.hostname) / ns.getWeakenTime(server.hostname) * 100) + '%',
        ]);
    }

    data.sort((a, b) => {
        const aAmount = ns.hackAnalyze(a[0]) * ns.getServerMaxMoney(a[0]);
        const bAmount = ns.hackAnalyze(b[0]) * ns.getServerMaxMoney(b[0]);
        return aAmount - bAmount;
    });

    ns.ui.clearTerminal();
    tFormatAsTable(ns, headers, data);

}
