import { NS } from '@ns';
import { printStats } from '/lib/format';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';


const sleepMillis = 1000;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * 4));
    ns.print("ServerManager is booting up, please wait...");


    const serverManager = new ServerManager(ns);

    while (true) {
        await serverManager.tick();
        await ns.sleep(sleepMillis);
    }
}

class ServerManager {
    private readonly ns: NS;

    private purchasedCount: number;
    private currentRam = 4;
    private upgradeRam = 8;
    private upgradeCost = 0;
    private upgradedCount = 0;

    private lastTick: number = Date.now();
    private tickStart: number = Date.now();

    private readonly uiBox1 = new Map<string, string>();


    constructor(ns: NS) {
        this.ns = ns;
        this.purchasedCount = ns.getPurchasedServers().length;
        this.calculateRam();
    }

    public async tick() {
        this.lastTick = this.tickStart;
        this.tickStart = Date.now();


        if (this.purchasedCount < this.ns.getPurchasedServerLimit()) {
            this.purchaseServers();
        } else if (this.upgradeRam <= this.ns.getPurchasedServerMaxRam()) {
            await this.upgradeServers();
        }

        this.updateLog();
    }

    private updateLog() {
        const now = new Date();
        const tickTime = Date.now() - this.tickStart;
        const tickDelay = this.tickStart - this.lastTick;

        this.uiBox1.set('Time', `${now.toLocaleTimeString()} - TickTime: ${tickTime}ms - TickDelay: ${tickDelay}ms`);
        this.uiBox1.set('Servers', `${this.purchasedCount}`);
        this.uiBox1.set('RAM', `${this.ns.formatRam(this.currentRam, 0)} -> ${this.ns.formatRam(this.upgradeRam, 0)}`);
        this.uiBox1.set('Upgrade ', `${this.upgradedCount} / ${this.purchasedCount}`);
        this.uiBox1.set('Upgrade Cost ', `$${this.ns.formatNumber(this.upgradeCost, 0)}`);


        this.ns.clearLog();
        if (this.purchasedCount < this.ns.getPurchasedServerLimit()) {
            this.ns.ui.setTailTitle(`Purchasing ${this.ns.formatRam(this.currentRam, 0)} (${this.purchasedCount} / ${this.ns.getPurchasedServerLimit()})`);
        } else if (this.upgradeRam <= this.ns.getPurchasedServerMaxRam()) {
            this.ns.ui.setTailTitle(`Upgrading to ${this.ns.formatRam(this.upgradeRam, 0)} (${this.upgradedCount} / ${this.purchasedCount})`);
        } else {
            this.ns.ui.setTailTitle(`Purchased servers are maxed out`);
            this.ns.exit();
        }

        this.ns.ui.resizeTail(600, TITLE_HEIGHT + (LINE_HEIGHT * this.uiBox1.size));
        printStats(this.ns, this.uiBox1);
        this.ns.ui.renderTail();
    }

    private calculateRam() {
        const hosts = this.ns.getPurchasedServers();
        if (hosts.length > 0) {
            this.currentRam = this.ns.getServerMaxRam(hosts[0]);
        }

        for (const host of hosts) {
            if (this.ns.getServerMaxRam(host) < this.currentRam) {
                this.currentRam = this.ns.getServerMaxRam(host);
            }
        }

        this.upgradedCount = 0;
        this.upgradeRam = this.currentRam * 2;

        for (const host of hosts) {
            if (this.ns.getServerMaxRam(host) >= this.upgradeRam) {
                this.upgradedCount++;
            } else {
                this.upgradeCost = this.ns.getPurchasedServerUpgradeCost(host, this.upgradeRam)
            }
        }
    }

    private purchaseServers() {
        while (this.ns.getServerMoneyAvailable('home') > this.ns.getPurchasedServerCost(this.currentRam) && this.purchasedCount < this.ns.getPurchasedServerLimit()) {
            const serverNumber = `${this.purchasedCount + 1}`.padStart(2, '0');
            this.ns.purchaseServer('voz-drone-' + serverNumber, this.currentRam);
            this.purchasedCount++;
        }
    }

    private async upgradeServers() {
        while (this.ns.getServerMoneyAvailable('home') > this.upgradeCost && this.upgradeRam <= this.ns.getPurchasedServerMaxRam()) {
            await this.ns.sleep(25);
            const hosts = this.ns.getPurchasedServers();
            let allUpgraded = true;

            for (const host of hosts) {
                if (this.ns.getServerMaxRam(host) >= this.upgradeRam) {
                    continue;
                }

                if (this.ns.getServerMaxRam(host) < this.upgradeRam) {
                    allUpgraded = false;
                }

                if (this.ns.getServerMoneyAvailable('home') > this.ns.getPurchasedServerUpgradeCost(host, this.upgradeRam)) {
                    this.ns.upgradePurchasedServer(host, this.upgradeRam);
                    this.upgradedCount++;
                }
            }

            if (allUpgraded) {
                this.calculateRam();
                this.updateLog();
            }
        }
    }
}