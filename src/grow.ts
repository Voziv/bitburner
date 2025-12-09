import {NS} from '@ns';

export async function main(ns: NS): Promise<void> {
    const target = ns.args[0].toString();
    const moneyThresh = ns.getServerMaxMoney(target);

    while (true) {
        if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            await ns.grow(target);
        }

        await ns.sleep(50);
    }
}