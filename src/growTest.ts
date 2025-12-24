import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.tprint('');

    const server = ns.getServer('rho-construction');
    const player = ns.getPlayer();

    let lastThreadCount = 1;
    for (let moneyPercent = 1; moneyPercent <= 99; moneyPercent++) {
        server.moneyAvailable = server.moneyMax * (1 - moneyPercent / 100);
        const threads = ns.formulas.hacking.growThreads(server, player, server.moneyMax!, 1);
        const money = ns.formulas.hacking.growAmount(server, player, threads, 1) - server.moneyAvailable;
        server.moneyAvailable = server.moneyMax!;
        const moneyPerThread = money / threads;
        ns.tprint(`Need ${threads.toString().padStart(4)} to grow ${moneyPercent.toString().padStart(3)}% ($${ns.formatNumber(money, 2).toString().padStart(10)}) of the servers money. ${Math.round((threads - lastThreadCount) / lastThreadCount * 10000) / 100}% more. ($${ns.formatNumber(moneyPerThread, 2).toString().padStart(10)} / thread)`);

        lastThreadCount = threads;
    }

    server.moneyAvailable = 1_000_000
    const threadsToGrow = ns.formulas.hacking.growThreads(server, player, server.moneyMax!);
    const securityIncrease = ns.growthAnalyzeSecurity(threadsToGrow, undefined, 1);

    server.moneyAvailable = server.moneyMax!;
    const threadsToGrowMax = ns.formulas.hacking.growThreads(server, player, server.moneyMax!);
    const securityIncreaseMax = ns.growthAnalyzeSecurity(threadsToGrow, undefined, 1);
    ns.tprint(`${threadsToGrow} = ${securityIncrease}`)
}
