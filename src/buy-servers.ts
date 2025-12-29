import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    while (!allServersBought(ns)) {
        // ns.tprint(`Purchasing server`);
        if (ns.getServerMoneyAvailable('home') < ns.getPurchasedServerCost(8)) {
            // ns.tprint(`Can't afford to purchase, breaking!`);
            break;
        }

        const serverNumber = (ns.getPurchasedServers().length + 1).toString().padStart(2, '0');
        ns.purchaseServer(`voz-drone-${serverNumber}`, 8);
    }

    upgradeLoop: while (allServersBought(ns) && !allServersUpgraded(ns)) {
        const upgradeRam = getLowestRam(ns) * 2;

        for (const purchasedServer of ns.getPurchasedServers()) {
            // ns.tprint(`Upgrading ${purchasedServer} to ${upgradeRam}`);
            if (ns.getServerMoneyAvailable('home') < ns.getPurchasedServerCost(upgradeRam)) {
                // ns.tprint(`Can't afford to upgrade, breaking while loop.`);
                break upgradeLoop;
            }

            ns.upgradePurchasedServer(purchasedServer, upgradeRam);
        }
    }
}

function getLowestRam(ns: NS) {
    let ram = 0;

    // Figure out what the higest ram is
    for (const purchasedServer of ns.getPurchasedServers()) {
        if (ns.getServerMaxRam(purchasedServer) > ram) {
            ram = ns.getServerMaxRam(purchasedServer);
        }
    }

    // Use the highest to determine the lowest
    for (const purchasedServer of ns.getPurchasedServers()) {
        if (ns.getServerMaxRam(purchasedServer) < ram) {
            ram = ns.getServerMaxRam(purchasedServer);
        }
    }

    return ram;
}

function allServersBought(ns: NS) {
    return ns.getPurchasedServers().length === ns.getPurchasedServerLimit();
}

function allServersUpgraded(ns: NS) {
    return getLowestRam(ns) === ns.getPurchasedServerMaxRam();
}