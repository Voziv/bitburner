import {NS} from '@ns';
import {countTools, useTools} from '/lib/tools';
import {HOSTS_BY_REQUIRED_PORTS} from '/lib/servers';

const hackScript = 'early-game-hack.js';
const homeHost = 'home';
const firstTarget = 'harakiri-sushi';
const purchasedServerTarget = 'iron-gym';
const homeReservedRam = 512;


const milestones = {
    hackZero: false,
    hackOne: false,
    hackTwo: false,
    hackThree: false,
    hackFour: false,
    hackFive: false,
    purchasedServers: 0,
};

let serverRam = 4;


export async function main(ns: NS): Promise<void> {
    milestones.purchasedServers = ns.getPurchasedServers().length;

    // Ensure we've nuked the initial target
    ns.nuke(firstTarget);

    const bestTarget = countTools(ns) > 0 ? purchasedServerTarget : firstTarget;

    if (bestTarget != firstTarget && ns.isRunning(hackScript, homeHost, firstTarget)) {
        ns.scriptKill(hackScript, homeHost);
    }

    if (!ns.isRunning(hackScript, homeHost, bestTarget)) {
        const homeHackingRam = ns.getServerMaxRam(homeHost) - homeReservedRam;
        const hackScriptRam = ns.getScriptRam(hackScript);
        if (homeHackingRam > hackScriptRam) {
            const threads = Math.floor((ns.getServerMaxRam(homeHost) - homeReservedRam) / ns.getScriptRam(hackScript));
            ns.exec(hackScript, homeHost, threads, bestTarget);
        }
    }


    while (true) {
        if (
            milestones.purchasedServers >= ns.getPurchasedServerLimit()
            && milestones.hackZero
            && milestones.hackOne
            && milestones.hackTwo
            && milestones.hackThree
            && milestones.hackFour
            && milestones.hackFive
        ) {
            break;
        }

        let toolCount = countTools(ns);

        if (!milestones.hackZero) {
            hack(ns, HOSTS_BY_REQUIRED_PORTS[0]);
            milestones.hackZero = true;
        } else if (!milestones.hackOne && toolCount >= 1) {
            hack(ns, HOSTS_BY_REQUIRED_PORTS[1]);
            milestones.hackOne = true;
        } else if (!milestones.hackTwo && toolCount >= 2) {
            hack(ns, HOSTS_BY_REQUIRED_PORTS[2]);
            milestones.hackTwo = true;
        } else if (!milestones.hackThree && toolCount >= 3) {
            hack(ns, HOSTS_BY_REQUIRED_PORTS[3]);
            milestones.hackThree = true;
        } else if (!milestones.hackFour && toolCount >= 4) {
            hack(ns, HOSTS_BY_REQUIRED_PORTS[4]);
            milestones.hackFour = true;
        } else if (!milestones.hackFive && toolCount >= 5) {
            hack(ns, HOSTS_BY_REQUIRED_PORTS[5]);
            milestones.hackFive = true;
        }

        if (milestones.purchasedServers < ns.getPurchasedServerLimit()) {
            purchaseServers(ns);
        } else if (serverRam <= ns.getPurchasedServerMaxRam()) {
            upgradeServers(ns);
        }

        await ns.sleep(50);
    }

    ns.tprint('Init script all done, shutting down.');
    await ns.sleep(60000);
}

function upgradeServers(ns: NS) {
    let allUpgraded = true;
    const target = countTools(ns) > 0 ? purchasedServerTarget : firstTarget;

    for (let i = 0; i < milestones.purchasedServers; i++) {
        const serverNumber = `${i + 1}`.padStart(2, '0');
        let host = `voz-drone-${serverNumber}`;
        if (ns.getServerMaxRam(host) < serverRam) {
            allUpgraded = false;
        }

        if (ns.getServerMoneyAvailable('home') > ns.getPurchasedServerUpgradeCost(host, serverRam)) {
            ns.upgradePurchasedServer(host, serverRam);
        }

        startScripting(ns, host, target);
    }

    if (allUpgraded) {
        ns.tprint('All servers upgraded');
        serverRam *= 2;
        ns.tprint(`New Server Ram ${ns.formatRam(serverRam)}`);
    }
}

function purchaseServers(ns: NS) {
    const ram = 32;

    // Check if we have enough money to purchase a server
    if (ns.getServerMoneyAvailable('home') > ns.getPurchasedServerCost(ram)) {
        const serverNumber = `${milestones.purchasedServers + 1}`.padStart(2, '0');
        let host = ns.purchaseServer('voz-drone-' + serverNumber, ram);
        const target = countTools(ns) > 0 ? purchasedServerTarget : firstTarget;
        startScripting(ns, host, target);
        ++milestones.purchasedServers;
    }
}

function startScripting(ns: NS, host: string, target: string) {
    const runningScript = ns.getRunningScript(hackScript, host, target);
    const threads = Math.floor(ns.getServerMaxRam(host) / ns.getScriptRam(hackScript, homeHost));

    if (threads < 1) {
        return;
    }

    if (!Number.isFinite(threads)) {
        ns.tprint(`${ns.getServerMaxRam(host)} GB on ${host}`);
        ns.tprint(`${ns.getScriptRam(hackScript, homeHost)} GB for ${hackScript}`);
        ns.tprint(`Threads === ${threads} on host ${host}`);
        ns.exit();
    }

    if (runningScript && runningScript.threads == threads && runningScript.args[0].toString() === target) {
        return;
    }

    ns.killall(host);
    ns.scp(hackScript, host, homeHost);
    ns.exec(hackScript, host, threads, target);
}


function hack(ns: NS, hosts: string[]) {
    for (const host of hosts) {
        if (!ns.hasRootAccess(host)) {
            useTools(ns, host);
            ns.nuke(host);
        }

        if (ns.getServerMaxRam(host) < ns.getScriptRam(hackScript)) {
            continue;
        }

        startScripting(ns, host, firstTarget);
    }
}