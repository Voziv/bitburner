import {NS} from '@ns';

const hackScript = 'early-game-hack.js';
const target = 'iron-gym';


export async function main(ns: NS): Promise<void> {
    const serverCount = ns.getPurchasedServers().length;

    for (let i = 0; i < serverCount; i++) {
        const serverNumber = `${i + 1}`.padStart(2, '0');
        let hostname = 'voz-drone-' + serverNumber;
        const threads = Math.floor(ns.getServerMaxRam(hostname) / ns.getScriptRam(hackScript));
        ns.scp(hackScript, hostname);
        ns.killall(hostname);
        ns.exec(hackScript, hostname, threads, target);
    }
}