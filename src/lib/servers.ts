import { NS } from '@ns';
import { AUTOPLAY_SCRIPTS } from '/autoplay';


export function getBotnet(ns: NS) {
    return getAllServers(ns)
        .filter(host => ns.getServer(host).maxRam >= 4)
        .sort((host1, host2) => {
            if (host1 === 'home') return -1;
            if (host2 === 'home') return 1;
            if (ns.getServer(host1).purchasedByPlayer && ns.getServer(host2).purchasedByPlayer) {
                return host1.localeCompare(host2);
            }
            if (ns.getServer(host1).purchasedByPlayer) return -1;
            if (ns.getServer(host2).purchasedByPlayer) return 1;

            return ns.getServer(host2).maxRam - ns.getServer(host1).maxRam;
        });
}

export function getTargets(ns: NS) {
    return getAllServers(ns)
        .filter(host => !ns.getServer(host).purchasedByPlayer);
}

export function getAllServers(ns: NS): string[] {
    return crawl(ns, 'home');
}

export function getRam(ns: NS, host: string): [ availableRam: number, maxRam: number ] {

    let reservedMaxRam = 0;
    let reservedAvailableRam = 0;

    // Make sure we're always taking hacker.ts and servers.ts into account.
    if (host === 'home') {
        const HOME_SCRIPTS = [ 'autoplay.ts', 'hacker.ts', 'servers.ts', 'train.ts' ];

        // Take into account that autoplay runs scripts one at a time
        // We need to reserve room for the largest script
        let autoplayScriptsMaxRam = 0;
        let autoplayScriptsUsedRam = 0;
        for (const script of AUTOPLAY_SCRIPTS) {
            const scriptRam = ns.getScriptRam(script, host);
            if (scriptRam > autoplayScriptsMaxRam) {
                autoplayScriptsMaxRam = scriptRam;
            }
            // In case we're in the middle of running any of these scripts
            if (ns.scriptRunning(script, host)) {
                autoplayScriptsUsedRam += scriptRam;
            }
        }
        reservedMaxRam += autoplayScriptsMaxRam;
        reservedAvailableRam += autoplayScriptsMaxRam - autoplayScriptsUsedRam;

        if (ns.getServerMaxRam(host) > 512) {
            reservedMaxRam += 64;
            reservedAvailableRam += 64;
        }

        for (const script of HOME_SCRIPTS) {
            reservedMaxRam += ns.getScriptRam(script, host);
            if (!ns.scriptRunning(script, host)) {
                reservedAvailableRam += ns.getScriptRam(script, host);
            }
        }
    }

    const maxRam = ns.getServerMaxRam(host) - reservedMaxRam;
    const availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host) - reservedAvailableRam;

    return [ availableRam, maxRam ];
}

export function getMaxThreads(ns: NS, host: string, scriptRam: number): number {
    const [ _, maxRam ] = getRam(ns, host);
    if (maxRam < scriptRam) {
        return 0;
    }

    return Math.floor(maxRam / scriptRam);
}

export function getAvailableThreads(ns: NS, host: string, scriptRam: number): number {
    const [ availableRam, _ ] = getRam(ns, host);
    if (availableRam < scriptRam) {
        return 0;
    }

    return Math.floor(availableRam / scriptRam);
}

export function getUsedThreads(ns: NS, host: string, scriptRam: number): number {
    const [ availableRam, maxRam ] = getRam(ns, host);
    const usedRam = maxRam - availableRam;
    if (usedRam < scriptRam) {
        return 0;
    }

    return Math.floor(usedRam / scriptRam);
}

function crawl(ns: NS, startingHost: string) {
    const visited = new Set();
    const queue = [ startingHost ];
    const result = [];

    visited.add(startingHost);

    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node);

        const neighbors = ns.scan(node);

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return result;
}