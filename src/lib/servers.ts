import { NS } from '@ns';


export function getRam(ns: NS, host: string): [ availableRam: number, maxRam: number ] {
    const HOME_SCRIPTS = [ 'hacker.ts', 'servers.ts', 'train.ts', 'exp.ts' ];

    let reservedMaxRam = 0;
    let reservedAvailableRam = 0;

    // Make sure we're always taking hacker.ts and servers.ts into account.
    if (host === 'home') {
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