import { AutocompleteData, NS } from '@ns';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';
import { Spinner } from '/lib/Spinner';


const sleepMillis = 1000;
const MAX_SCAN_DEPTH = 25;
const WINDOW_WIDTH = 400;

export function autocomplete(data: AutocompleteData, args: string[]) {
    return [ ...data.servers ];
}

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * 1));
    ns.print('Monitor is booting up, please wait...');

    const monitor = new Monitor(ns, ns.args[0] as string ?? 'n00dles');

    while (true) {
        await monitor.tick();
        await ns.sleep(sleepMillis);
    }
}

export class Monitor {
    private ns: NS;
    private target: string;
    private spinner: Spinner;

    private stats = new Map<string, string>();


    constructor(ns: NS, target: string) {
        this.ns = ns;
        this.target = target;
        this.spinner = new Spinner();
    }

    public async tick() {
        await this.updateLog();
    }

    private async updateLog() {
        this.stats.set('Has Root', this.ns.hasRootAccess(this.target) ? 'Yes' : 'No');
        this.stats.set('Money', `$${this.ns.formatNumber(this.ns.getServerMoneyAvailable(this.target))} / $${this.ns.formatNumber(this.ns.getServerMaxMoney(this.target))}`);
        this.stats.set('Security', `${this.ns.formatNumber(this.ns.getServerSecurityLevel(this.target))} (Min: ${this.ns.formatNumber(this.ns.getServerMinSecurityLevel(this.target), 0)})`);
        this.stats.set('Hack Chance', `${this.ns.formatNumber(this.ns.hackAnalyzeChance(this.target) * 100)}%`);
        this.stats.set('Weaken Time', `${this.ns.tFormat(this.ns.getWeakenTime(this.target))}`);


        this.ns.clearLog();
        this.ns.ui.setTailTitle(`[${this.spinner.next()}]${this.target}`);

        this.ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * this.stats.size));
        printStats(this.ns, this.stats);
        this.ns.ui.renderTail();
    }
}