import {NS} from '@ns';

const script = 'money.js';
const target = 'n00dles';

const hosts = [
    // Servers that can be nuked right away
    [
        'n00dles',
        'harakiri-sushi',
        'hong-fang-tea',
        'joesguns',
        'foodnstuff',
        'nectar-net',
        'sigma-cosmetics',
    ],
    // Servers that need at least 1 port before being nuked
    [
        'neo-net',
        'zer0',
        'max-hardware',
        'iron-gym',
    ],
];

export async function main(ns: NS): Promise<void> {

    // Can't use singularity yet. Not sure when it gets unlocked or whether it's permanent or not.
    // ns.singularity.universityCourse(ns.enums.LocationName.Sector12RothmanUniversity, ns.enums.UniversityClassType.computerScience, true)


    for (const host of hosts[0]) {
        const threads = Math.floor(ns.getServerMaxRam(host) / ns.getScriptRam(script));
        ns.scp(script, host);
        ns.nuke(host);
        ns.killall(host);
        ns.exec(script, host, threads, target);
    }

    while (!ns.fileExists('BruteSSH.exe')) {
        await ns.sleep(60000);
    }

    for (const host of hosts[1]) {
        const threads = Math.floor(ns.getServerMaxRam(host) / ns.getScriptRam(script));
        ns.scp(script, host);
        ns.brutessh(host);
        ns.nuke(host);
        ns.nuke(host);
        ns.killall(host);
        ns.exec(script, host, threads, target);
    }
}