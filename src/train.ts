import { NS } from '@ns';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(300, TITLE_HEIGHT + (LINE_HEIGHT * 2));

    let isDoingSomething = false;

    ns.atExit(() => {
        if (isDoingSomething) {
            ns.singularity.stopAction();
        }
    });

    while (true) {
        ns.clearLog();
        const player = ns.getPlayer();
        let shouldStudy = player.skills.hacking < 100;
        let shouldTrain = false;
        if (shouldStudy) {
            ns.print('Training Data Structures');
            // Function expects an enum, but enums break the game (it can't import enums)
            // @ts-ignore
            ns.singularity.universityCourse('Rothman University', 'Data Structures', true);
            isDoingSomething = true;

        } else if (shouldTrain) {
            let lowestSkill = 'agi';
            let lowestNumber = player.skills.agility;

            if (player.skills.defense < lowestNumber) {
                lowestSkill = 'def';
                lowestNumber = player.skills.defense;
            }

            if (player.skills.dexterity < lowestNumber) {
                lowestSkill = 'dex';
                lowestNumber = player.skills.dexterity;
            }

            if (player.skills.strength < lowestNumber) {
                lowestSkill = 'str';
                lowestNumber = player.skills.strength;
            }

            ns.print(`Training ${lowestSkill}`);

            // Function expects an enum, but enums break the game (it can't import enums)
            // @ts-ignore
            ns.singularity.gymWorkout('Powerhouse Gym', lowestSkill, true);
            isDoingSomething = true;
        } else {
            ns.exit();
        }

        await ns.sleep(60000);
    }
}