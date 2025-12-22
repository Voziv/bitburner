import { NS } from '@ns';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';
import { printStats } from '/lib/format';

const stats = new Map<string, any>();

export async function main(ns: NS): Promise<void> {
    ns.exec('hacker.js', 'home');
    ns.exec('servers.js', 'home');

    while (true) {
        if (!ns.hasTorRouter() && ns.getServerMoneyAvailable('home') > 200_000) {
            ns.singularity.purchaseTor();
            ns.print("TOR purchased")
        }

        if (ns.hasTorRouter()) {
            const programs = ns.singularity.getDarkwebPrograms();
            for (const program of programs) {
                if (ns.getServerMoneyAvailable('home') > ns.singularity.getDarkwebProgramCost(program)) {
                    ns.singularity.purchaseProgram(program);
                }
            }
        }

        updateLog(ns, stats);
    }
}

function updateLog(ns: NS, stats: Map<string, any>) {
    stats.set('Hello', 'World');

    ns.clearLog();
    ns.ui.setTailTitle(`Singularity script`);

    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * stats.size));
    printStats(ns, stats);
    ns.ui.renderTail();
}