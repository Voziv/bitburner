import { GymLocationName, NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.ui.clearTerminal();

    while (true) {
        const player = ns.getPlayer();

        let lowestSkill = 'agi';
        let lowestNumber = player.skills.agility;

        if (player.skills.defense < lowestNumber){
            lowestSkill = 'def';
            lowestNumber = player.skills.defense;
        }

        if (player.skills.dexterity < lowestNumber){
            lowestSkill = 'dex';
            lowestNumber = player.skills.dexterity;
        }

        if (player.skills.strength < lowestNumber){
            lowestSkill = 'str';
            lowestNumber = player.skills.strength;
        }

        ns.singularity.gymWorkout("Powerhouse Gym", lowestSkill, true);

        await ns.sleep(60000);
    }
}