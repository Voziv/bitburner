import { NS } from '@ns';


const FACTIONS = [
    'Aevum',
    "Bachman & Associates",
    'BitRunners',
    "Blade Industries",
    "Bladeburners",
    'Chongqing',
    "Church of the Machine God",
    "Clarke Incorporated",
    'CyberSec',
    'Daedalus',
    "ECorp",
    "Four Sigma",
    "Fulcrum Secret Technologies",
    "Illuminati",
    'Ishima',
    "KuaiGong International",
    "MegaCorp",
    "NWO",
    'Netburners',
    'New Tokyo',
    'NiteSec',
    "OmniTek Incorporated",
    'Sector-12',
    "Shadows of Anarchy",
    "Silhouette",
    "Slum Snakes",
    "Speakers for the Dead",
    "Tetrads",
    'The Black Hand',
    "The Covenant",
    "The Dark Army",
    "The Syndicate",
    'Tian Di Hui',
    'Volhaven',
];

export async function main(ns: NS): Promise<void> {
    const levelsPurchased = purchaseNeuroFlux(ns);
    ns.tprint(`Bought ${levelsPurchased} levels of NeuroFlux Governor`);
}

function getHighestRepFaction(ns: NS): [ faction: string, rep: number ] {
    let highestRepFaction = '';
    let highestRep = 0;
    for (const faction of FACTIONS) {
        const rep = ns.singularity.getFactionRep(faction);
        if (rep > highestRep) {
            highestRep = rep;
            highestRepFaction = faction;
        }
    }

    return [ highestRepFaction, highestRep ];
}

function purchaseNeuroFlux(ns: NS): number {
    const aug = 'NeuroFlux Governor';
    const [ faction, rep ] = getHighestRepFaction(ns);
    let levelsPurchased = 0;

    while (ns.getServerMoneyAvailable('home') >= ns.singularity.getAugmentationPrice(aug) && rep >= ns.singularity.getAugmentationRepReq(aug)) {
        ns.singularity.purchaseAugmentation(faction, aug);
        levelsPurchased++;
    }

    return levelsPurchased;
}
