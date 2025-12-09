import {NS} from '@ns';
import {countTools} from '/lib/tools';

export async function main(ns: NS): Promise<void> {
    const maxServers = ns.getPurchasedServerLimit();
    const purchasedServers = ns.getPurchasedServers().length;
    let ram = 32;

    for (let i = purchasedServers; i < maxServers; i++) {
        const serverNumber = `${i + 1}`.padStart(2, '0');
        let hostname = ns.purchaseServer('voz-drone-' + serverNumber, ram);
    }

    for (let i = 0; i < maxServers; i++) {
        const serverNumber = `${i + 1}`.padStart(2, '0');
        let success = ns.upgradePurchasedServer('voz-drone-' + serverNumber, Math.pow(2, 20));
        if (!success) {
            ns.tprint('Could not go into debt buying servers');
        }
    }
}