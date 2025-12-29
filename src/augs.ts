import { NS } from '@ns';


const FACTIONS = [
    'Aevum',
    // "Bachman & Associates",
    'BitRunners',
    // "Blade Industries",
    // "Bladeburners",
    'Chongqing',
    // "Church of the Machine God",
    // "Clarke Incorporated",
    'CyberSec',
    'Daedalus',
    // "ECorp",
    // "Four Sigma",
    // "Fulcrum Secret Technologies",
    // "Illuminati",
    'Ishima',
    // "KuaiGong International",
    // "MegaCorp",
    // "NWO",
    'Netburners',
    'New Tokyo',
    'NiteSec',
    // "OmniTek Incorporated",
    'Sector-12',
    // "Shadows of Anarchy",
    // "Silhouette",
    // "Slum Snakes",
    // "Speakers for the Dead",
    // "Tetrads",
    'The Black Hand',
    // "The Covenant",
    // "The Dark Army",
    // "The Syndicate",
    'Tian Di Hui',
    'Volhaven',
];

function canReset(ns: NS): boolean {
    if (ns.hasRootAccess(''))
    return false;
}

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.tprint('');

    if (canReset(ns)) {
        ns.exec('reset.ts', 'home');
    }

    const augments: string[] = [];

    const ownedAugments = ns.singularity.getOwnedAugmentations(false);
    for (const faction of FACTIONS) {
        const factionAugments = ns.singularity.getAugmentationsFromFaction(faction)
        for (const factionAugment of factionAugments) {
        if (!augments.includes(factionAugment)){
            augments.push(factionAugment);
        }

        }
    }

    for (const augment of augments) {
        const stats = ns.singularity.getAugmentationStats(augment);

        if (ownedAugments.includes(augment)) continue;

        if (
            stats.hacking <= 1
            && stats.hacking_exp <= 1
            && stats.hacking_speed <= 1
            && stats.hacking_money <= 1
            && stats.hacking_grow <= 1
            && stats.hacking_chance <= 1
        ) continue;

        const { hacking, hacking_exp, hacking_speed, hacking_money, hacking_grow, hacking_chance } = stats;
        const hackStats = { hacking, hacking_exp, hacking_speed, hacking_money, hacking_grow, hacking_chance };
        const factions = ns.singularity.getAugmentationFactions(augment);

        // ns.tprint(`${faction} --> ${augment} -> ${JSON.stringify(hackStats)}`);
        ns.tprint(`${augment.padEnd(50)} ${factions.filter((faction) => FACTIONS.includes(faction)).map((faction) => faction.slice(0, 10).padEnd(11)).join(' - ')}`);
    }
}