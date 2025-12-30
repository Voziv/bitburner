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

    await joinTianDiHui(ns);
    acceptAllInvites(ns);

    /**
     * Initially buy all the 'cheap' augments (rep < 200k)
     */
    let factionToWorkOn = selectFaction(ns);
    if (factionToWorkOn) {
        await workOnFaction(ns, factionToWorkOn);
        return;
    }

    /**
     * After all the cheap augments are purchased, grind favor for the
     */
    let factionToGrindFavor = selectFactionToGrindFavor(ns);
    if (factionToGrindFavor) {
        await workOnFaction(ns, factionToGrindFavor);
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
 * Select the faction to work on
 */
function selectFaction(ns: NS) {
    const ownedAugments = ns.singularity.getOwnedAugmentations();
    for (const faction of FACTION_NAMES) {
        // Neuroflux is available everywhere and is infinite,
        // so we ignore it here. We'll buy it as part of resetting,
        // or when there are no more factions to work on.
        const augments = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(augment => !ownedAugments.includes(augment))
            .filter(augment => augment !== NEUROFLUX_GOVERNOR);

        const cheapAugments = augments
            .filter(augment => ns.singularity.getAugmentationRepReq(augment) < 235_000);

        if (cheapAugments.length > 0) {
            return faction;
        }

        if (ns.singularity.getFactionRep(faction) >= 150 && augments.length > 0) {
            return faction;
        }
    }
}

/**
 * Select the faction to grind favor with
 */
function selectFactionToGrindFavor(ns: NS) {
    const ownedAugments = ns.singularity.getOwnedAugmentations();
    for (const faction of FACTION_NAMES) {
        // Neuroflux is available everywhere and is infinite,
        // so we ignore it here. We'll buy it as part of resetting,
        // or when there are no more factions to work on.
        const augments = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(augment => !ownedAugments.includes(augment))
            .filter(augment => augment !== NEUROFLUX_GOVERNOR);

        if (ns.singularity.getFactionRep(faction) < 150 && augments.length > 0) {
            return faction;
        }
    }
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

async function joinTianDiHui(ns: NS) {
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
}

function acceptAllInvites(ns: NS) {
    // Autojoin all factions that don't have enemies.
    // We want to be gaining passive rep whenever we can.
    for (const faction of ns.singularity.checkFactionInvitations()) {
        // Only autojoin factions when there are zero consequences.
        if (ns.singularity.getFactionEnemies(faction).length === 0) {
            // ns.tprint(`Joining ${faction}`);
            ns.singularity.joinFaction(faction);
        }
    }
}

async function workOnFaction(ns: NS, faction: string) {
    if (ns.getPlayer().factions.includes(faction)) {
        const ownedAugments = ns.singularity.getOwnedAugmentations();

        /**
         * Stop training, in case we get enough rep early on.
         */
        const currentWork = ns.singularity.getCurrentWork();
        if (currentWork && currentWork.type === 'CLASS') {
            ns.singularity.stopAction();
            ns.scriptKill('train.ts', 'home');
        }

        /**
         * Start working for the faction so we're gaining rep.
         */
        if (!currentWork || currentWork.type !== 'FACTION' || currentWork.factionName !== faction || currentWork.factionWorkType !== 'hacking') {
            // No need to focus if we've bought Neuroreceptor Management Implant
            const focus = !ownedAugments.includes('Neuroreceptor Management Implant');
            ns.singularity.workForFaction(faction, ns.enums.FactionWorkType.hacking, focus);
        }

        /**
         * Then depending on our goal, we should buy augs and reset when appropriate.
         */

        let purchasedAugments = ns.singularity.getOwnedAugmentations(true);
        const augmentsToBuy = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(augment => augment !== NEUROFLUX_GOVERNOR)
            .filter(augment => !purchasedAugments.includes(augment))
            .sort((augment1, augment2) => {
                return ns.singularity.getAugmentationPrice(augment2) - ns.singularity.getAugmentationPrice(augment1);
            });


        const favor = ns.singularity.getFactionFavor(faction);

        for (const augment of augmentsToBuy) {
            const rep = ns.singularity.getFactionRep(faction);
            const repRequired = ns.singularity.getAugmentationRepReq(augment);
            const donationRequired = Math.max(0, Math.ceil(ns.formulas.reputation.donationForRep(repRequired - rep, ns.getPlayer())));
            const augmentPrice = ns.singularity.getAugmentationPrice(augment);

            // If we can, buy our way to the rep required
            if (rep < repRequired && favor > 150 && ns.getPlayer().money > donationRequired) {
                ns.singularity.donateToFaction(faction, donationRequired);
            } else {
                break;
            }

            if (ns.getPlayer().money < augmentPrice) {
                break;
            }

            ns.singularity.purchaseAugmentation(faction, augment);
        }

        purchasedAugments = ns.singularity.getOwnedAugmentations(true);
        const remainingAugmentsToBuy = ns.singularity.getAugmentationsFromFaction(faction)
            .filter(augment => augment !== NEUROFLUX_GOVERNOR)
            .filter(augment => !purchasedAugments.includes(augment));

        const shouldResetForFavor = ns.singularity.getFactionFavor(faction) < 150 && ns.singularity.getFactionFavor(faction) + ns.singularity.getFactionFavorGain(faction) >= 150;

        if (remainingAugmentsToBuy.length === 0 || shouldResetForFavor) {
            await reset(ns);
        }
    }
}