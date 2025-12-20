import { NS } from '@ns';
import { ServerList } from '/lib/ServerList';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';

const sleepMillis = 1000;
const stats = new Map<string, any>();

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * 12));
    ns.print('Autoplay is booting up, please wait...');

    while (true) {
        updateLog(ns);
        await ns.sleep(sleepMillis);
    }
}

function updateLog(ns: NS) {
    stats.set('Time', `${new Date().toTimeString()}`);

    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * stats.size));
    printStats(ns, stats);
    ns.ui.renderTail();
}