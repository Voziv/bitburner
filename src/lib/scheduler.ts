import { NS, Player, Server } from '@ns';


enum Action {
    Hack = 'Hack',
    Grow = 'Grow',
    Weaken = 'Weaken',
}

export const MAX_SCRIPTS = 200_000;

let server: Server;
let player: Player;

export function hack(ns: NS, target: string) {
    server = ns.getServer(target);
    player = ns.getPlayer();

    player.skills.hacking = ns.formulas.skills.calculateSkill(player.exp.hacking);
}

export function calculateBestHackTarget(ns: NS) {
    ns.singularity.getFactionRep('asdf');
}

function calculateBestBatch(ns: NS) {
    ns.singularity.getFactionRep('asdf');
}