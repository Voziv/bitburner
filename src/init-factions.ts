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

    ns.ui.clearTerminal();
    const FACTION_NAMES = Object.values(ns.enums.FactionName);
    ns.tprint(FACTION_NAMES);
    ns.exit();
}