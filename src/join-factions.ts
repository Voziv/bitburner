import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    for (const faction of ns.singularity.checkFactionInvitations()) {
        // Only autojoin factions when there are zero consequences.
        if (ns.singularity.getFactionEnemies(faction).length === 0) {
            ns.singularity.joinFaction(faction);
        }
    }
}