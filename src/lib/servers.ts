import {NS, Server} from '@ns';

export type Host = {
    name: string;
    hackLevel: number;
    currentMoney: number;
    maxMoney: number;
    maxRam: number;
    portsRequired: number;
    depth: number;
}

export type Hosts = {
    [name: string]: Host;
}

const MAX_DEPTH = 25;

export const HOSTS_BY_REQUIRED_PORTS = [
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
        'CSEC', // CyberSec
        'neo-net',
        'zer0',
        'max-hardware',
        'iron-gym',
    ],
    // Servers that need at least 2 port before being nuked
    [
        'phantasy',
        'silver-helix',
        'avmnite-02h', // NiteSec
        'omega-net',
        'crush-fitness',
        'johnson-ortho',
        'the-hub',
    ],
    // Servers that need at least 3 port before being nuked
    [
        'I.I.I.I',
        'computek',
        'rothman-uni',
        'netlink',
        'catalyst',
        'summit-uni',
        'millenium-fitness',
        'rho-construction',
    ],
    // Servers that need at least 4 port before being nuked
    [
        'aevum-police',
        '.',
        'run4theh111z',
        'alpha-ent',
        'syscore',
        'lexo-corp',
        'nova-med',
        'unitalife',
        'applied-energetics',
        'global-pharm',
        'snap-fitness',
        'zb-def',
        'univ-energy',
    ],
    // Servers that need at least 5 port before being nuked
    [
        'zb-institute',
        'solaris',
        'helios',
        'vitalife',
        'microdyne',
        'zeus-med',
        'titan-labs',
        'galactic-cyber',
        'taiyang-digital',
        'deltaone',
        'omnia',
        'aerocorp',
        'icarus',
        'infocomm',
        'The-Cave',
        'omnitek',
        'stormtech',
        'powerhouse-fitness',
        'defcomm',
        'clarkinc',
        'b-and-a',
        'ecorp',
        'blade',
        'kuai-gong',
        'nwo',
        '4sigma',
        'fulcrumtech',
        'megacorp',
        'fulcrumassets',
    ],
];

export function upgradeServer(ns: NS, target: string) {
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

const HOSTS = new Set<string>();
const SERVERS = new Map<string, Server>();

export async function getServers(ns: NS) {
    for (const host of HOSTS) {
        SERVERS.set(host, ns.getServer(host));
    }

}

export async function getHosts(ns: NS, hostToScan: string, depth: number) {
    await ns.sleep(1);

    if (depth > MAX_DEPTH) {
        return;
    }

    const hosts = ns.scan(hostToScan);
    for (const host of hosts) {
        if (HOSTS.has(host)) {
            continue;
        }
        HOSTS.add(host);
        await getHosts(ns, host, depth + 1);
    }

}

export async function scan(ns: NS, host: string, hosts: Hosts, depth: number) {
    // Ensure we provide the ability for other scripts to run
    await ns.sleep(1);

    if (depth > MAX_DEPTH) {
        return;
    }

    const results = ns.scan(host);
    for (const result of results) {
        if (result.startsWith('voz-') || result == 'home' || Object.hasOwn(hosts, result)) {
            continue;
        }
        hosts[result] = {
            name: result,
            currentMoney: ns.getServerMoneyAvailable(result),
            maxMoney: ns.getServerMaxMoney(result),
            maxRam: ns.getServerMaxRam(result),
            portsRequired: ns.getServerNumPortsRequired(result),
            hackLevel: ns.getServerRequiredHackingLevel(result),
            depth,
        };
        await scan(ns, result, hosts, depth + 1);
    }
}