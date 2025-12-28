import { NS } from '@ns';

// Filler augment to use excess money before we reset
// OR if we're trying to grind stats to finish the BN
const NEUROFLUX_GOVERNOR = 'NeuroFlux Governor';


const HACKING_AUGS = [
    'Synaptic Enhancement Implant',
    'Neuralstimulator',
    'Neurotrainer I',
    'Artificial Bio-neural Network Implant',
    'Enhanced Myelin Sheathing',
    'DataJack',
    'Embedded Netburner Module',
    'Embedded Netburner Module Core Implant',
    'Embedded Netburner Module Core V2 Upgrade',
    'Neural Accelerator',
    'Cranial Signal Processors - Gen III',
    'Cranial Signal Processors - Gen IV',
    'Cranial Signal Processors - Gen V',
    'Neurotrainer II',
    'BitRunners Neurolink',
    'Neuregen Gene Modification',
    'BitWire',
    'Cranial Signal Processors - Gen I',
    'Cranial Signal Processors - Gen II',
    'Embedded Netburner Module Core V3 Upgrade',
    'Embedded Netburner Module Analyze Engine',
    'Embedded Netburner Module Direct Memory Access Upgrade',
    'Artificial Synaptic Potentiation',
    'Neural-Retention Enhancement',
    'CRTX42-AA Gene Modification',
    'The Black Hand',
];

const FACTION_NAMES = [
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

type Faction = {
    name: string;
    rep: number;
    favor: number;
}

type Augment = {
    name: string;
    factions: string[];
    neededRep: string[];
    prerequisites: Augment[];
}

function getFactions(ns: NS) {

}

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    const factions = new Map<string, Faction>;
    const augments = new Map<string, Faction>;
    const augmentsToBuy: string[] = [];
    const ownedAugments = ns.singularity.getOwnedAugmentations();
    const purchasedAugments = ns.singularity.getOwnedAugmentations(true).filter(augment => !ownedAugments.includes(augment));



    for (const factionName of FACTION_NAMES) {
        const faction: Faction = {
            favor: ns.singularity.getFactionFavor(factionName),
            name: factionName,
            rep: ns.singularity.getFactionRep(factionName),
        };
        const factionAugments = ns.singularity.getAugmentationsFromFaction(faction);
        for (const factionAugment of factionAugments) {
            if (!augments.includes(factionAugment)) {
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
        ns.tprint(`${augment.padEnd(50)} ${factions.filter((faction) => FACTION_NAMES.includes(faction)).map((faction) => faction.slice(0, 10).padEnd(11)).join(' - ')}`);
    }
}