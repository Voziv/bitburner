import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    const player = ns.getPlayer();
    const server = ns.getServer('n00dles');


    player.exp.hacking = 1;

    for (let i = 1; i <= 40; i++) {
        player.exp.hacking = Math.pow(2, i);

        const hackTime = ns.formulas.hacking.hackTime(server, player);
        ns.tprint(`Hacking ${player.skills.hacking}: ${ns.tFormat(hackTime)}`)
    }

}