import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    const maxHomeRam = Math.pow(2, 30);

    while (ns.getServerMaxRam('home') < maxHomeRam && ns.getServerMoneyAvailable('home') > ns.singularity.getUpgradeHomeRamCost()) {
        if (!ns.singularity.upgradeHomeRam()){
            // Make sure we never infinite loop if this fails for some unexpected reason.
            break;
        }
    }

    // Cores are a low priority compared to ram.
    while (ns.getServerMoneyAvailable('home') > ns.singularity.getUpgradeHomeCoresCost()) {
        if (!ns.singularity.upgradeHomeCores()) {
            // Make sure we never infinite loop if this fails for some unexpected reason.
            break;
        }
    }
}