import { NS, Server } from '@ns';
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
        'Security',
        'Hack %',
        'Hack Steal %',
        'Hack Steal $', // At max money
        'Hack Steal $ / Minute',
        // 'Hack Time',
        // 'Grow Time',
        'Weaken Time',
        // 'Hack / Weaken Time',
        // 'Grow / Weaken Time',
    ];

    const player = ns.getPlayer();

    const maxThreads = Array.from(serverList.servers.values())
        .filter(server => ns.hasRootAccess(server.hostname))
        .reduce((acc, botnetServer) => {
            return acc + Math.floor((ns.getServerMaxRam(botnetServer.hostname) - ns.getServerUsedRam(botnetServer.hostname) - ((botnetServer.hostname === 'home') ? 16 : 0)) / 1.85);
        }, 0);

    const servers = Array.from(serverList.botNet.values())

    const data: string[][] = [];
    for (const server of servers) {
        server.hackDifficulty = server.minDifficulty;

        const weakenTime = ns.formulas.hacking.weakenTime(server, player);

        data.push([
            server.hostname,
            ns.formatNumber(server.requiredHackingSkill ?? 0, 0),
            '$' + ns.formatNumber(server.moneyMax ?? -1, 0),
            ns.formatNumber(server.serverGrowth ?? -1, 0),
            `${ns.formatNumber(ns.getServerSecurityLevel(server.hostname), 0)} (min. ${ns.formatNumber(ns.getServerMinSecurityLevel(server.hostname), 0)})`,
            ns.formatNumber(ns.hackAnalyzeChance(server.hostname) * 100, 0) + '%',
            ns.formatNumber(ns.hackAnalyze(server.hostname) * 100) + '%',
            '$' + ns.formatNumber(ns.hackAnalyze(server.hostname) * ns.getServerMaxMoney(server.hostname), 2),
            '$' + ns.formatNumber(getHackMoneyPerTime(ns, server.hostname, maxThreads), 2),
            // ns.tFormat(ns.getHackTime(server.hostname)),
            // ns.tFormat(ns.getGrowTime(server.hostname)),
            ns.tFormat(weakenTime),
            // ns.formatNumber(ns.getHackTime(server.hostname) / ns.getWeakenTime(server.hostname) * 100) + '%',
            // ns.formatNumber(ns.getGrowTime(server.hostname) / ns.getWeakenTime(server.hostname) * 100) + '%',
        ]);
    }

    data.sort((a, b) => {
        const aMoneyPerMin = getHackMoneyPerTime(ns, a[0], maxThreads);
        const bMoneyPerMin = getHackMoneyPerTime(ns, b[0], maxThreads);
        return aMoneyPerMin - bMoneyPerMin;

        const aAmount = ns.hackAnalyze(a[0]) * ns.getServerMaxMoney(a[0]);
        const bAmount = ns.hackAnalyze(b[0]) * ns.getServerMaxMoney(b[0]);
        return aAmount - bAmount;
    });

    ns.ui.clearTerminal();
    tFormatAsTable(ns, headers, data);

}

function getHackMoneyPerTime(ns: NS, target: string, maxThreads: number): number {
    const player = ns.getPlayer();
    const stealPercent = ns.hackAnalyze(target);
    const stealAmount = stealPercent * ns.getServerMaxMoney(target);
    const stealAmountPerTime = stealAmount / ns.getHackTime(target);
    const stealAmountAllThreads = stealAmount / ns.getHackTime(target);
    const score = stealAmountAllThreads * ns.hackAnalyzeChance(target);
    return score;
}
