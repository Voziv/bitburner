import {NS} from '@ns';

export async function main(ns: NS): Promise<void> {
    ns.tprintf(`Purchased Servers can have a maximum of %s GB RAM}`, ns.formatRam(ns.getPurchasedServerMaxRam()));

    let counter = 0;
    for (let i = 1; i <= 20; i++) {
        const ram = Math.pow(2, i);
        counter++;
        //ns.tprintf(`%s GB RAM Server = $%s}`, ns.formatRam(ram, 0), ns.formatNumber(ns.getPurchasedServerCost(ram)));
        ns.tprintf(`%s GB RAM Server = $%s}`, ns.formatRam(ram, 0), ns.formatNumber(ns.getPurchasedServerUpgradeCost('voz-drone-01', ram)));
    }
}