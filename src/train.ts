import { GymType, NS, UniversityClassType, UniversityLocationName } from '@ns';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.ui.openTail();
    ns.ui.resizeTail(300, TITLE_HEIGHT + (LINE_HEIGHT * 2));

    let isDoingSomething = false;

    ns.atExit(() => {
        if (isDoingSomething) {
            ns.singularity.stopAction();
        }
        ns.ui.closeTail();
    });

    // 1. Train hacking to level 100
    // 2. Train charisma to level 100
    // 3. Train gym skills to level 100
    while (true) {

        const player = ns.getPlayer();
        let skill = 0;
        let target = 0;

        if (player.skills.hacking < 100) {
            study(ns, ns.enums.UniversityClassType.algorithms);
            isDoingSomething = true;
            skill = player.skills.hacking;
            target = 100;
        } else if (player.skills.charisma < 100) {
            study(ns, ns.enums.UniversityClassType.leadership);
            skill = player.skills.charisma;
            target = 100;
            isDoingSomething = true;
        } else if (player.skills.agility < 100) {
            trainAtGym(ns, ns.enums.GymType.agility);
            skill = player.skills.agility;
            target = 100;
            isDoingSomething = true;
        } else if (player.skills.defense < 100) {
            trainAtGym(ns, ns.enums.GymType.defense);
            skill = player.skills.defense;
            target = 100;
            isDoingSomething = true;
        } else if (player.skills.dexterity < 100) {
            trainAtGym(ns, ns.enums.GymType.dexterity);
            skill = player.skills.dexterity;
            target = 100;
            isDoingSomething = true;
        } else if (player.skills.strength < 100) {
            trainAtGym(ns, ns.enums.GymType.strength);
            skill = player.skills.strength;
            target = 100;
            isDoingSomething = true;
        } else {
            break;
        }

        ns.clearLog();
        const currentWork = ns.singularity.getCurrentWork();
        if (currentWork?.type === 'CLASS') {
            ns.print(`Training: ${currentWork.classType} (${skill} / ${target})`);
        } else {
            ns.print(`Doing Other Task: ${currentWork.type}`);
        }


        await ns.sleep(1000);
    }
}


function study(ns: NS, universityClassType: UniversityClassType) {
    const currentWork = ns.singularity.getCurrentWork();
    if (currentWork?.type === 'CLASS' && currentWork.classType === universityClassType) {
        return;
    }

    const player = ns.getPlayer();

    let universityLocationName = '';
    if (player.city === ns.enums.CityName.Sector12) {
        universityLocationName = ns.enums.LocationName.Sector12RothmanUniversity;
    } else if (player.city === ns.enums.CityName.Aevum) {
        universityLocationName = ns.enums.LocationName.AevumSummitUniversity;
    } else if (player.city === ns.enums.CityName.Volhaven) {
        universityLocationName = ns.enums.LocationName.VolhavenZBInstituteOfTechnology;
    } else {
        return;
    }

    ns.singularity.universityCourse(
        universityLocationName as UniversityLocationName,
        universityClassType,
        true,
    );
}

function trainAtGym(ns: NS, skill: GymType) {
    const currentWork = ns.singularity.getCurrentWork();
    if (currentWork?.type === 'CLASS' && currentWork.classType === skill) {
        return;
    }

    const player = ns.getPlayer();


    let gymLocationName;
    if (player.city === ns.enums.CityName.Sector12) {
        gymLocationName = ns.enums.LocationName.Sector12PowerhouseGym;
    } else if (player.city === ns.enums.CityName.Aevum) {
        gymLocationName = ns.enums.LocationName.AevumSummitUniversity;
    } else if (player.city === ns.enums.CityName.Volhaven) {
        gymLocationName = ns.enums.LocationName.VolhavenZBInstituteOfTechnology;
    } else {
        return;
    }

    ns.singularity.gymWorkout(
        gymLocationName,
        skill,
        true,
    );
}