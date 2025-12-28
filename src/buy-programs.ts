import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    if (!ns.hasTorRouter()) {
        if (ns.getServerMoneyAvailable('home') > 200_000) {
            ns.singularity.purchaseTor();
        } else {
            ns.print('Cannot afford TOR router yet.');
            ns.exit();
        }
    }

    if (ns.singularity.getDarkwebPrograms().length > 0) {
        for (const darkwebProgram of ns.singularity.getDarkwebPrograms()) {
            if (ns.singularity.getDarkwebProgramCost(darkwebProgram) > 0) {
                const darkwebProgramCost = ns.singularity.getDarkwebProgramCost(darkwebProgram);
                if (ns.getServerMoneyAvailable('home') > darkwebProgramCost) {
                    ns.singularity.purchaseProgram(darkwebProgram);
                } else {
                    ns.print(`Cannot afford ${darkwebProgram}. It costs $${ns.formatNumber(darkwebProgramCost)}, you have $${ns.formatNumber(ns.getServerMoneyAvailable('home'))}`);
                }
            }
        }
    }
}
