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

const milestones = {
    hackZero: false,
    hackOne: false,
    hackTwo: false,
    hackThree: false,
    hackFour: false,
    hackFive: false,
    purchasedServers: 0,
}

const tools = [
    'BruteSSH.exe',
    'FTPCrack.exe',
    'relaySMTP.exe',
    'HTTPWorm.exe',
    'SQLInject.exe',
];

export async function main(ns: NS): Promise<void> {

    // Can't use singularity yet. Not sure when it gets unlocked or whether it's permanent or not.
    // ns.singularity.universityCourse(ns.enums.LocationName.Sector12RothmanUniversity, ns.enums.UniversityClassType.computerScience, true)

    while (true) {
        if (
            milestones.purchasedServers >= ns.getPurchasedServerLimit()
            && milestones.hackOne
            && milestones.hackTwo
        ) {
            break;
        }

        let toolCount = countTools(ns);

        if (!milestones.hackZero) {
            hack(ns, hosts[0]);
            milestones.hackZero = true;
        } else if (!milestones.hackOne && toolCount >= 1) {
            hack(ns, hosts[1]);
            milestones.hackOne = true;
        } else if (!milestones.hackTwo && toolCount >= 2) {
            hack(ns, hosts[2]);
            milestones.hackTwo = true;
        } else if (!milestones.hackThree && toolCount >= 3) {
            hack(ns, hosts[3]);
            milestones.hackThree = true;
        } else if (!milestones.hackFour && toolCount >= 4) {
            hack(ns, hosts[4]);
            milestones.hackFour = true;
        } else if (!milestones.hackFive && toolCount >= 5) {
            hack(ns, hosts[5]);
            milestones.hackFive = true;
        }

        if (milestones.purchasedServers >= ns.getPurchasedServerLimit()) {
            purchaseServers(ns);
        }

        await ns.sleep(1000);
    }
}

function countTools(ns: NS) {
    let toolCount = 0;


    for (const tool of tools) {
        if (ns.fileExists(tool)) {
            toolCount++;
        }
    }

    return toolCount;
}

function purchaseServers(ns: NS) {
    const script = "money.js"
    const target = "joesguns"
    const ram = 8;

    // Check if we have enough money to purchase a server
    if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
        const serverNumber = `${milestones.purchasedServers + 1}`.padStart(2, '0');
        let hostname = ns.purchaseServer("voz-drone-" + serverNumber, ram);
        ns.scp(script, hostname);
        ns.exec(script, hostname, 3, target);
        ++milestones.purchasedServers;
    }
}

function useTools(ns: NS, target: string) {
    for (const tool of tools) {
        if (ns.fileExists(tool)) {
            ns.exec(tool, target);
        }
    }
}

function hack(ns: NS, hosts: string[]) {
    for (const host of hosts) {
        const threads = Math.floor(ns.getServerMaxRam(host) / ns.getScriptRam(script));
        ns.scp(script, host);
        useTools(ns, host);
        ns.nuke(host);
        ns.killall(host);
        ns.exec(script, host, threads, target);
    }
}