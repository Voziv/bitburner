import {NS} from '@ns';


export class PurchasedServers {
    private ns: NS;

    public purchasedCount: number;
    public currentRam = 4;


    constructor(ns: NS) {
        this.ns = ns;
        this.purchasedCount = ns.getPurchasedServers().length;
        this.calculateRam();
    }

    public async onTick() {
        if (this.purchasedCount >= this.ns.getPurchasedServerLimit()) {
            this.upgradeServers();
        } else {
            this.purchaseServers();
        }
    }

    calculateRam() {
        const hosts = this.ns.getPurchasedServers();

        for (const host of hosts) {
            if (this.ns.getServerMaxRam(host) < this.currentRam) {
                this.currentRam = this.ns.getServerMaxRam(host);
            }
        }
    }

    purchaseServers() {
        if (this.ns.getServerMoneyAvailable('home') > this.ns.getPurchasedServerCost(this.currentRam)) {
            const serverNumber = `${this.purchasedCount + 1}`.padStart(2, '0');
            this.ns.purchaseServer('voz-drone-' + serverNumber, this.currentRam);
            this.purchasedCount++;
        }
    }

    upgradeServers() {
        let allUpgraded = true;
        const hosts = this.ns.getPurchasedServers();

        for (const host of hosts) {
            if (this.ns.getServerMaxRam(host) >= this.currentRam) {
                continue;
            }

            if (this.ns.getServerMaxRam(host) < this.currentRam) {
                allUpgraded = false;
            }

            if (this.ns.getServerMoneyAvailable('home') > this.ns.getPurchasedServerUpgradeCost(host, this.currentRam)) {
                this.ns.upgradePurchasedServer(host, this.currentRam);

                this.ns.print(`Upgraded ${host} to ${this.ns.formatRam(this.currentRam)}`);
            }
        }

        if (allUpgraded) {
            this.ns.print(`All servers have at least ${this.ns.formatRam(this.currentRam)}`);
            this.calculateRam();
            this.currentRam *= 2;
            this.ns.print(`New Server Ram ${this.ns.formatRam(this.currentRam)}`);
        }
    }
}