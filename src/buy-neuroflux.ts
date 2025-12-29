import { NS } from '@ns';


const FACTIONS = [
    'Aevum',
    'Bachman & Associates',
    'BitRunners',
    'Blade Industries',
    'Bladeburners',
    'Chongqing',
    'Church of the Machine God',
    'Clarke Incorporated',
    'CyberSec',
    'Daedalus',
    'ECorp',
    'Four Sigma',
    'Fulcrum Secret Technologies',
    'Illuminati',
    'Ishima',
    'KuaiGong International',
    'MegaCorp',
    'NWO',
    'Netburners',
    'New Tokyo',
    'NiteSec',
    'OmniTek Incorporated',
    'Sector-12',
    'Shadows of Anarchy',
    'Silhouette',
    'Slum Snakes',
    'Speakers for the Dead',
    'Tetrads',
    'The Black Hand',
    'The Covenant',
    'The Dark Army',
    'The Syndicate',
    'Tian Di Hui',
    'Volhaven',
];

const augment = 'NeuroFlux Governor';

export async function main(ns: NS): Promise<void> {
    const levelsPurchased = purchaseNeuroFlux(ns);
    ns.tprint(`Bought ${levelsPurchased} levels of ${augment}`);
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
    const repNeeded = ns.singularity.getAugmentationRepReq(augment);
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

    return ns.singularity.getFactionRep(faction) >= ns.singularity.getAugmentationRepReq(augment);
}

function purchaseNeuroFlux(ns: NS): number {
    const faction = getHighestRepFaction(ns);
    let levelsPurchased = 0;

    while (ns.getServerMoneyAvailable('home') >= ns.singularity.getAugmentationPrice(augment) && checkRep(ns, faction)) {
        ns.singularity.purchaseAugmentation(faction, augment);
        levelsPurchased++;
    }

    return levelsPurchased;
}
