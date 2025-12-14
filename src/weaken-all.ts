import { BasicHGWOptions, NS } from '@ns';
import { ServerList } from '/lib/ServerList';

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.enableLog('weaken');
    ns.clearLog();

    const serverList = new ServerList(ns);
    await serverList.onTick();

    const botnetServers = Array.from(serverList.servers.values())
        .filter(server => ns.hasRootAccess(server.hostname));

    const servers = Array.from(serverList.servers.values())
        .filter(server => !server.hostname.startsWith('voz-'))
        .filter(server => server.hasAdminRights)
        .filter(server => server.moneyMax)
        .filter(server => ns.getHackingLevel() > ns.getServerRequiredHackingLevel(server.hostname))
        .sort((a, b) => {
            return ns.getWeakenTime(a.hostname) - ns.getWeakenTime(b.hostname);
        });

    for (const server of servers) {
        let skipServer = false;
        while (!skipServer && ns.getServerSecurityLevel(server.hostname) > ns.getServerMinSecurityLevel(server.hostname)) {
            const weakenTime = ns.getWeakenTime(server.hostname);

            ns.print(`Weakening ${server.hostname} ${ns.formatNumber(ns.getServerSecurityLevel(server.hostname), 2)} (min. ${ns.getServerMinSecurityLevel(server.hostname)}) (${ns.tFormat(weakenTime)})`);
            if (weakenTime > 1000 * 60 * 5) {
                ns.print(`Skipping ${server.hostname} because it is taking too long`);
                skipServer = true;
                break;
            }

            for (const botnetServer of botnetServers) {
                ns.scp('hack.js', server.hostname, 'home');
                const threads = Math.floor((ns.getServerMaxRam(botnetServer.hostname) - ns.getServerUsedRam(botnetServer.hostname) - ((botnetServer.hostname === 'home') ? 16 : 0)) / 1.85);
                if (threads === 0) continue;
                ns.exec('hack.js', botnetServer.hostname, { threads, ramOverride: 1.85 }, 'weaken', server.hostname);
            }

            await ns.sleep(weakenTime + 2000);
        }
    }
}