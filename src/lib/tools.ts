import { NS, Server } from '@ns';


const TOOLS = [
    'BruteSSH.exe',
    'FTPCrack.exe',
    'relaySMTP.exe',
    'HTTPWorm.exe',
    'SQLInject.exe',
];

export class Tools {
    private ns: NS;

    public toolCount = 0;

    constructor(ns: NS) {
        this.ns = ns;
    }

    public async onTick() {
        let toolCount = 0;

        for (const tool of TOOLS) {
            if (this.ns.fileExists(tool)) {
                toolCount++;
            }
        }

        this.toolCount = toolCount;
    }

    public openPorts(target: string) {
        if (this.ns.fileExists('BruteSSH.exe', 'home')) {
            this.ns.brutessh(target);
        }

        if (this.ns.fileExists('FTPCrack.exe', 'home')) {
            this.ns.ftpcrack(target);
        }

        if (this.ns.fileExists('relaySMTP.exe', 'home')) {
            this.ns.relaysmtp(target);
        }

        if (this.ns.fileExists('HTTPWorm.exe', 'home')) {
            this.ns.httpworm(target);
        }

        if (this.ns.fileExists('SQLInject.exe', 'home')) {
            this.ns.sqlinject(target);
        }
    }
}

export function countTools(ns: NS) {
    let toolCount = 0;


    for (const tool of TOOLS) {
        if (ns.fileExists(tool)) {
            toolCount++;
        }
    }

    return toolCount;
}

export function useTools(ns: NS, target: string) {
    if (ns.fileExists('BruteSSH.exe', 'home')) {
        ns.brutessh(target);
    }
    if (ns.fileExists('FTPCrack.exe', 'home')) {
        ns.ftpcrack(target);
    }
    if (ns.fileExists('relaySMTP.exe', 'home')) {
        ns.relaysmtp(target);
    }
    if (ns.fileExists('HTTPWorm.exe', 'home')) {
        ns.httpworm(target);
    }
    if (ns.fileExists('SQLInject.exe', 'home')) {
        ns.sqlinject(target);
    }
}