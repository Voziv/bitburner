import { NS } from '@ns';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';
import { printStats } from '/lib/format';
import { Spinner } from '/lib/Spinner';


const stats = new Map<string, any>();

const sleepMillis = 500;
const WINDOW_WIDTH = 400;

const spinner = new Spinner();

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * 1));
    ns.print('Singularity is booting up');

    stats.set('TOR', 'Not purchased');
    while (true) {
        if (!ns.hasTorRouter()) {
            if (ns.getServerMoneyAvailable('home') > 200_000) {
                ns.singularity.purchaseTor();
                stats.set('TOR', 'Purchased');
            }
        } else if (ns.singularity.getDarkwebPrograms().length > 0) {
            let unPurchasedPrograms = 0;
            for (const darkwebProgram of ns.singularity.getDarkwebPrograms()) {
                if (ns.singularity.getDarkwebProgramCost(darkwebProgram) > 0) {
                    unPurchasedPrograms++;
                    if (ns.getServerMoneyAvailable('home') > ns.singularity.getDarkwebProgramCost(darkwebProgram)) {
                        ns.singularity.purchaseProgram(darkwebProgram);
                    }
                }
            }
            if (unPurchasedPrograms > 0) {
                stats.set('TOR', `${ns.singularity.getDarkwebPrograms().length} programs left to purchase.`);
            } else {
                stats.set('TOR', `All programs purchased.`);
            }

        }

        updateLog(ns, stats);
        await ns.sleep(sleepMillis);
    }
}

function updateLog(ns: NS, stats: Map<string, any>) {
    ns.clearLog();
    ns.ui.setTailTitle(`[${spinner.next()}] Autoplay`);

    ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * stats.size));
    printStats(ns, stats);
    ns.ui.renderTail();
}