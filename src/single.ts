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
    this.stats.set('Action', `${this.totalThreads - this.availableThreads} / ${this.totalThreads}`);
    this.stats.set('Target', this.target);
    this.stats.set('State', this.hackState);
    this.stats.set('# of Batches', this.batches.length);

    const money = `$${this.ns.formatNumber(this.ns.getServerMoneyAvailable(this.target), 0)} / $${this.ns.formatNumber(this.ns.getServerMaxMoney(this.target), 0)}`;

    this.targetStats.set('Money', money);
    this.targetStats.set('Security', `${this.ns.formatNumber(this.ns.getServerSecurityLevel(this.target))} (Min: ${this.ns.formatNumber(this.ns.getServerMinSecurityLevel(this.target), 0)})`);

    this.targetStats.set(`Now`, `${new Date(this.now).toTimeString()}`);
    this.targetStats.set(`TTNA Date`, `${new Date(this.timeUntilNextAction).toTimeString()}`);
    this.targetStats.set(`TTNA`, `${this.ns.tFormat(this.timeUntilNextAction - this.now)}`);
    this.targetStats.set(`Grow Time`, `${this.ns.tFormat(this.ns.getGrowTime(this.target))}`);
    this.targetStats.set(`Weaken Time`, `${this.ns.tFormat(this.ns.getWeakenTime(this.target))}`);
    this.targetStats.set(`Hack Time`, `${this.ns.tFormat(this.ns.getHackTime(this.target))}`);

    this.ns.clearLog();
    this.ns.ui.setTailTitle(`Hacking ${this.target} (${money})`);

    this.ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * (this.stats.size + this.targetStats.size + this.hackStats.size)));
    printStats(this.ns, this.stats);
    printStats(this.ns, this.targetStats);
    printStats(this.ns, this.hackStats);
    this.ns.ui.renderTail();
}