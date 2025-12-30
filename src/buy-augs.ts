import { NS } from '@ns';
import { runAndWait } from '/autoplay';

// Filler augment to use excess money before we reset
// OR if we're trying to grind stats to finish the BN
export const NEUROFLUX_GOVERNOR = 'NeuroFlux Governor';

// We're going to buy all augs from these, in the order stated.
const FACTION_NAMES = [
    'CyberSec',
    'Sector-12',
    'NiteSec',
    'BitRunners',
    'The Black Hand',
    'Netburners',
    'Tian Di Hui',
    'Daedalus',
];


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    let ownedAugments = ns.singularity.getOwnedAugmentations();

    // const reqs = ns.singularity.getFactionInviteRequirements(ns.enums.FactionName.TianDiHui);
    // for (const req of reqs) {
    //     ns.tprint(`Req: ${JSON.stringify(req)}`);
    // }

    // Tian needs 1m cash, hacking level 50, and we need to visit one of [Chongqing, New Tokyo, Ishima]
    if (!ns.getPlayer().factions.includes(ns.enums.FactionName.TianDiHui) && ns.getPlayer().money >= 1_000_000 + 200_000 && ns.getPlayer().skills.hacking >= 50) {
        // ns.tprint('Trying to get an invite');
        if (!ns.singularity.travelToCity(ns.enums.CityName.NewTokyo)) throw new Error('Failed to travel to New Tokyo');
        while (!ns.singularity.checkFactionInvitations().includes(ns.enums.FactionName.TianDiHui)) {
            await ns.sleep(100);
        }
        if (!ns.singularity.travelToCity(ns.enums.CityName.Sector12)) throw new Error('Failed to travel to Sector 12');
    }


    // Autojoin all factions that don't have enemies. We want to be gaining passive rep whenever we can.
    for (const faction of ns.singularity.checkFactionInvitations()) {
        // Only autojoin factions when there are zero consequences.
        if (ns.singularity.getFactionEnemies(faction).length === 0) {
            ns.tprint(`Joining ${faction}`);
            ns.singularity.joinFaction(faction);
        }
    }

    /**
     * Initially buy all 'cheap' augments
     */
    let factionToBuyAugsFrom = selectFactionToBuyAugs(ns, ownedAugments);

    if (factionToBuyAugsFrom) {
        if (ns.getPlayer().factions.includes(factionToBuyAugsFrom)) {
            const currentWork = ns.singularity.getCurrentWork();

            if (!currentWork || currentWork.type !== 'FACTION' || currentWork.factionName !== factionToBuyAugsFrom || currentWork.factionWorkType !== 'hacking') {
                // No need to focus if we've bought Neuroreceptor Management Implant
                const focus = !ownedAugments.includes('Neuroreceptor Management Implant');
                ns.singularity.workForFaction(factionToBuyAugsFrom, ns.enums.FactionWorkType.hacking, focus);
            }

            let purchasedAugments = ns.singularity.getOwnedAugmentations(true);
            const augmentsToBuy = ns.singularity.getAugmentationsFromFaction(factionToBuyAugsFrom)
                .filter(augment => augment !== NEUROFLUX_GOVERNOR)
                .filter(augment => !purchasedAugments.includes(augment))
                .sort((augment1, augment2) => {
                    return ns.singularity.getAugmentationPrice(augment2) - ns.singularity.getAugmentationPrice(augment1);
                });

            const rep = ns.singularity.getFactionRep(factionToBuyAugsFrom);

            for (const augment of augmentsToBuy) {
                if (rep < ns.singularity.getAugmentationRepReq(augment) || ns.getPlayer().money < ns.singularity.getAugmentationPrice(augment)) {
                    break;
                }

                ns.singularity.purchaseAugmentation(factionToBuyAugsFrom, augment);
            }

            purchasedAugments = ns.singularity.getOwnedAugmentations(true);
            const remainingAugmentsToBuy = ns.singularity.getAugmentationsFromFaction(factionToBuyAugsFrom)
                .filter(augment => !purchasedAugments.includes(augment));

            if (remainingAugmentsToBuy.length === 0) {
                ns.print(`SUCCESS All augments for ${factionToBuyAugsFrom} purchased.`);
                await reset(ns);
            }
        }
        return;
    }

    /**
     * After all the cheap augments are purchased, grind favor for the
     */
    let factionToGrindFavor = selectFactionToGrindFavor(ns, ownedAugments);

    if (factionToGrindFavor) {
        if (ns.getPlayer().factions.includes(factionToGrindFavor)) {
            const currentWork = ns.singularity.getCurrentWork();

            if (!currentWork || currentWork.type !== 'FACTION' || currentWork.factionName !== factionToGrindFavor || currentWork.factionWorkType !== 'hacking') {
                // No need to focus if we've bought Neuroreceptor Management Implant
                const focus = !ownedAugments.includes('Neuroreceptor Management Implant');
                ns.singularity.workForFaction(factionToGrindFavor, ns.enums.FactionWorkType.hacking, focus);
            }

            const favorAfterReset = ns.singularity.getFactionFavor(factionToGrindFavor) + ns.singularity.getFactionFavorGain(factionToGrindFavor);

            if (favorAfterReset >= 150) {
                ns.print(`SUCCESS Favor for ${factionToGrindFavor} will be at 150 after reset.`);
                await reset(ns);
            }
        }
        return;

    }

    /**
     * Finally, grind Neuroflux until we can destroy the node.
     */
    purchaseNeuroFlux(ns);
    ownedAugments = ns.singularity.getOwnedAugmentations();
    const levelsOfNeurofluxPurchased = ns.singularity.getOwnedAugmentations(true)
        .filter(augment => !ownedAugments.includes(augment))
        .filter(augment => augment === NEUROFLUX_GOVERNOR);

    if (levelsOfNeurofluxPurchased > 5) {
        ns.print(`SUCCESS Purchased ${levelsOfNeurofluxPurchased} levels of ${NEUROFLUX_GOVERNOR}. Resetting.`);
        await reset(ns);
    }

}

/**
 * Select the faction that we are
 */
function selectFactionToBuyAugs(ns: NS, ownedAugments: string[]) {
    let selectedFaction;
    for (const faction of FACTION_NAMES) {
        // Neuroflux is something we buy before resetting
        const augmentsToPurchaseThisRun = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(augment => augment !== NEUROFLUX_GOVERNOR)
            .filter(augment => !ownedAugments.includes(augment))
            .filter(augment => ns.singularity.getAugmentationRepReq(augment) < 235_000);

        if (augmentsToPurchaseThisRun.length > 0) {
            selectedFaction = faction;
            break;
        }

    }

    return selectedFaction;
}

/**
 * Select the faction to grow to 150 favor
 */
function selectFactionToGrindFavor(ns: NS, ownedAugments: string[]) {
    let selectedFaction;
    for (const faction of FACTION_NAMES) {
        if (ns.singularity.getFactionFavor(faction) >= 150) continue;

        const augmentsToPurchaseThisRun = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(augment => augment !== NEUROFLUX_GOVERNOR)
            .filter(augment => !ownedAugments.includes(augment))
            .filter(augment => ns.singularity.getAugmentationRepReq(augment) > 235_000);

        if (augmentsToPurchaseThisRun.length > 0) {
            selectedFaction = faction;
            break;
        }
    }

    return selectedFaction;
}

async function reset(ns: NS) {
    ns.ui.openTail();
    ns.ui.resizeTail(600, 400);

    ns.print(`WARN Killing all scripts to make room to run reset.`);
    ns.killall('home', true);
    ns.print(`SUCCESS Buying all possible levels of neuroflux before reset.`);

    const levelsPurchased = purchaseNeuroFlux(ns);
    ns.print(`SUCCESS Bought ${levelsPurchased} of ${NEUROFLUX_GOVERNOR}.`);

    ns.print(`WARN Resetting in 10 seconds.`);
    await ns.sleep(10_000);
    await runAndWait(ns, 'reset.ts');
    ns.exit();
}


function getHighestRepFaction(ns: NS): string {
    let highestRepFaction = '';
    let highestRep = 0;
    for (const faction of ns.getPlayer().factions) {
        const rep = ns.singularity.getFactionRep(faction);
        const favor = ns.singularity.getFactionFavor(faction);

        // Always select a faction that has a favor of 150 or more
        // Money doesn't really matter so we can just afford to buy our way to the rep we need to buy levels.
        if (favor >= 150) {

            highestRep = rep;
            highestRepFaction = faction;
            break;
        }

        if (rep > highestRep) {
            highestRep = rep;
            highestRepFaction = faction;
        }
    }

    // ns.tprint(`Selected ${highestRepFaction}`);
    return highestRepFaction;
}

function checkRep(ns: NS, faction: string) {
    const rep = ns.singularity.getFactionRep(faction);
    const favor = ns.singularity.getFactionFavor(faction);
    const repNeeded = ns.singularity.getAugmentationRepReq(NEUROFLUX_GOVERNOR);
    // ns.tprint(`Rep needed: ${ns.formatNumber(repNeeded)}`);
    // ns.tprint(`Rep: ${ns.formatNumber(rep)}`);
    // ns.tprint(`Favor: ${ns.formatNumber(favor)}`);

    if (rep < repNeeded && favor >= 150) {
        const repToBuy = Math.ceil(repNeeded - rep);
        const costForRep = ns.formulas.reputation.donationForRep(repToBuy, ns.getPlayer());
        const costForAugment = ns.formulas.reputation.donationForRep(repToBuy, ns.getPlayer());
        const totalCost = costForAugment + costForRep;
        // ns.tprint(`Total Cost: $${ns.formatNumber(totalCost)}`);
        // ns.tprint(`Player Money: $${ns.formatNumber(ns.getPlayer().money)}`);
        if (ns.getPlayer().money >= totalCost) {
            // ns.tprint(`Purchasing: ${ns.formatNumber(repToBuy)} rep for $${ns.formatNumber(costForRep)} from ${faction}`);
            if (!ns.singularity.donateToFaction(faction, costForRep)) {
                // ns.tprint(`Failed to purchase ${ns.formatNumber(repToBuy)} rep for $${ns.formatNumber(costForRep)} from ${faction}`);
            } else {
                // ns.tprint(`Successfully purchased ${ns.formatNumber(repToBuy)} rep for $${ns.formatNumber(costForRep)} from ${faction}`);
            }
        }
    }

    return ns.singularity.getFactionRep(faction) >= ns.singularity.getAugmentationRepReq(NEUROFLUX_GOVERNOR);
}

export function purchaseNeuroFlux(ns: NS): number {
    const faction = getHighestRepFaction(ns);
    let levelsPurchased = 0;

    while (ns.getServerMoneyAvailable('home') >= ns.singularity.getAugmentationPrice(NEUROFLUX_GOVERNOR) && checkRep(ns, faction)) {
        ns.singularity.purchaseAugmentation(faction, NEUROFLUX_GOVERNOR);
        levelsPurchased++;
    }

    return levelsPurchased;
}

function getHackingAugments(ns: NS) {
    const augments = [];
    const factions = Object.values(ns.enums.FactionName);

    for (const faction of factions) {
        const factionAugments = ns.singularity.getAugmentationsFromFaction(faction);
        for (const augment of factionAugments) {
            if (augments.includes(augment)) {
                continue;
            }
            const stats = ns.singularity.getAugmentationStats(augment);
            if (
                stats.hacking <= 1
                && stats.hacking_exp <= 1
                && stats.hacking_speed <= 1
                && stats.hacking_money <= 1
                && stats.hacking_grow <= 1
                && stats.hacking_chance <= 1
            ) continue;

            augments.push(augment);
        }
    }

    return augments;
}