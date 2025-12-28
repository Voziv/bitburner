import { NS, Server } from '@ns';
import { tFormatAsTable } from '/lib/table';
import { ServerList } from '/lib/ServerList';
import { getMaxThreads, getRam } from '/lib/servers';


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
        'Security',
        'Hack %',
        'Hack Steal %',
        'Hack Steal $', // At max money
        'Hack Steal $ / Minute',
        'Score',
    ];

    const player = ns.getPlayer();
    'use asdf'


    const maxThreads = Array.from(serverList.servers.keys())
        .filter(host => ns.hasRootAccess(host))
        .reduce((acc, host) => {
            return acc + getMaxThreads(ns, host, 1.85);
        }, 0);

    const servers = Array.from(serverList.servers.values())
        .filter(server => !server.hostname.startsWith('voz-'))
        .filter(server => server.hasAdminRights)
        .filter(server => {
            server.hackDifficulty = server.minDifficulty;
            return ns.formulas.hacking.hackChance(server, player) > 0.25;
        })
        .filter(server => server.moneyMax);

    const data: string[][] = [];
    for (const server of servers) {
        server.hackDifficulty = server.minDifficulty;

        const hackPercent = ns.formulas.hacking.hackPercent(server, player);
        const hackChance = ns.formulas.hacking.hackChance(server, player);

        data.push([
            server.hostname,
            ns.formatNumber(server.requiredHackingSkill ?? 0, 0),
            '$' + ns.formatNumber(server.moneyMax ?? -1, 0),
            ns.formatNumber(server.serverGrowth ?? -1, 0),
            `${ns.formatNumber(ns.getServerSecurityLevel(server.hostname), 0)} (min. ${ns.formatNumber(ns.getServerMinSecurityLevel(server.hostname), 0)})`,
            ns.formatNumber(hackChance * 100, 0) + '%',
            ns.formatNumber(hackPercent * 100) + '%',
            '$' + ns.formatNumber(hackPercent * ns.getServerMaxMoney(server.hostname), 2),
            '$' + ns.formatNumber(getHackMoneyPerTime(ns, server.hostname, maxThreads), 2),
            ns.formatNumber(scoreServer(ns, server.hostname)),
        ]);
    }

    data.sort((a, b) => {
        const aScore = scoreServer(ns, a[0]);
        const bScore = scoreServer(ns, b[0]);
        return aScore - bScore;
    });

    ns.ui.clearTerminal();
    tFormatAsTable(ns, headers, data);

}

function getHackMoneyPerTime(ns: NS, target: string, maxThreads: number): number {
    return scoreServer(ns, target) * maxThreads;
}

function scoreServer(ns: NS, target: string): number {
    const server = ns.getServer(target);
    const player = ns.getPlayer();
    server.hackDifficulty = server.minDifficulty; // simulate the score being super low
    server.moneyAvailable = server.moneyMax; // simulate the score being super low
    if (ns.formulas.hacking.hackChance(server, player) < 1) return 0;

    const stealPercent = ns.formulas.hacking.hackPercent(server, player);
    const stealAmount = stealPercent * ns.getServerMaxMoney(target);
    return stealAmount / ns.formulas.hacking.hackTime(server, player);
}
