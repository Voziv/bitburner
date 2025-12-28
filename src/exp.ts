import { BasicHGWOptions, NS, Person, Server } from '@ns';
import { ServerList } from '/lib/ServerList';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';
import { getRam } from '/lib/servers';


const WINDOW_WIDTH = 600;
const WEAKEN_SCRIPT = 'loop-weaken.ts';
const WEAKEN_SCRIPT_RAM = 1.85;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * 4));
    ns.print('Setting up weaken loop on all servers.');

    const serverList = new ServerList(ns);
    await serverList.onTick();

    ns.atExit(() => {
        cleanUp(ns, serverList);
    });


    let target = '';
    let expPerTime = 0;
    let totalThreads = 0;
    while (true) {
        ns.clearLog();

        const [ newExpPerTime, newTarget ] = pickBestTarget(ns, serverList.servers);
        if (newTarget != target) {
            target = newTarget;
            expPerTime = newExpPerTime;
            cleanUp(ns, serverList);
            totalThreads = 0;
            if (target != '') {
                totalThreads = queueWeakens(ns, serverList, target);
            }
        } else {
            expPerTime = newExpPerTime;
        }

        ns.print(`Weakening ${target} with ${ns.formatNumber(totalThreads, 0)} threads.`);
        ns.print(`Expecting ${ns.formatNumber(expPerTime * 1000 * totalThreads)} exp/sec.`);
        await ns.sleep(1000);
    }
}

function queueWeakens(ns: NS, serverList: ServerList, target: string) {
    let totalThreads = 0;
    for (const [ host ] of serverList.servers) {
        ns.scp(WEAKEN_SCRIPT, host, 'home');

        let [ availableRam ] = getRam(ns, host);

        const threads = Math.floor(availableRam / WEAKEN_SCRIPT_RAM);
        if (threads < 1) continue;
        ns.exec(WEAKEN_SCRIPT, host, { threads }, target);
        totalThreads += threads;
    }

    return totalThreads;
}

function cleanUp(ns: NS, serverList: ServerList) {
    ns.atExit(() => {
        for (const [ host, server ] of serverList.servers) {
            ns.scriptKill(WEAKEN_SCRIPT, host);
        }
    });
}


function pickBestTarget(ns: NS, servers: Map<string, Server>) {
    let bestServer = 'n00dles';
    let bestExpPerTime = 0;
    const player = ns.getPlayer();
    for (const [ host, server ] of servers) {
        const hackExp = ns.formulas.hacking.hackExp(server, player);
        const weakenTime = ns.formulas.hacking.weakenTime(server, player);
        const expPerTime = hackExp / weakenTime;
        if (expPerTime > bestExpPerTime) {
            bestServer = host;
            bestExpPerTime = expPerTime;
        }
    }

    return [ bestExpPerTime, bestServer ];
}