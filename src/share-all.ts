import {NS} from '@ns';
import {printStats} from "/lib/format";
import {ServerList} from "/lib/ServerList";

const sleepMillis = 1000;

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    const [windowWidth] = ns.ui.windowSize()
    const width = 600;
    ns.ui.resizeTail(600, 150);
    ns.ui.moveTail(windowWidth - (width + 250 + 605 + 605), 5)


    const shareManager = new ShareManager(ns);

    while (true) {
        await shareManager.tick();
        await ns.sleep(sleepMillis);
    }
}

class ShareManager {
    private readonly ns: NS;
    private serverList: ServerList;

    private maxRam = 0;
    private maxThreads = 0;

    private sharedRam = 0;
    private sharedThreads = 0;
    private reShare = true;
    private shareScriptRam;

    private lastTick: number = Date.now();
    private tickStart: number = Date.now();

    private readonly uiBox1 = new Map<string, string>();


    constructor(ns: NS) {
        this.ns = ns;
        this.serverList = new ServerList(ns);
        this.shareScriptRam = this.ns.getScriptRam('share.js', 'home')
    }

    public async tick() {
        this.lastTick = this.tickStart;
        this.tickStart = Date.now()

        this.shareScriptRam = this.ns.getScriptRam('share.js', 'home')
        await this.serverList.onTick();

        const newTotalThreads = this.countThreads();
        if (newTotalThreads !== this.maxThreads) {
            this.maxThreads = newTotalThreads;
            this.reShare = true;
        }

        const newTotalRam = this.countRam();
        if (newTotalRam !== this.maxRam) {
            this.maxRam = newTotalRam;
            this.reShare = true;
        }

        if (this.reShare) {
            await this.share();
            this.reShare = false;
        }

        this.updateLog();
    }

    private updateLog() {
        const now = new Date();
        const tickTime = Date.now() - this.tickStart;
        const tickDelay = this.tickStart - this.lastTick;

        this.uiBox1.set('Time', `${now.toLocaleTimeString()} - TickTime: ${tickTime}ms - TickDelay: ${tickDelay}ms`);
        this.uiBox1.set('Status', `Sharing ${this.ns.formatRam(this.sharedRam)} over ${this.ns.formatNumber(this.sharedThreads, 0)} threads`);
        this.uiBox1.set('Max RAM', `${this.ns.formatRam(this.maxRam)}`);
        this.uiBox1.set('Max threads', `${this.ns.formatNumber(this.maxThreads, 0)}`);

        this.ns.clearLog();
        this.ns.ui.setTailTitle(`Sharing ${this.ns.formatRam(this.sharedRam)} over ${this.ns.formatNumber(this.sharedThreads, 0)} threads`)

        printStats(this.ns, this.uiBox1);
        this.ns.ui.renderTail()
    }

    private async share() {
        this.sharedRam = 0;
        for (const [host, server] of this.serverList.servers) {
            let threadsAvailable = this.maxHostThreads(host);
            if (threadsAvailable < 1) continue;

            if (host !== 'home') {
                // TODO: Check hashes and only copy when different?
                this.ns.scp('share.js', host, 'home');
            }

            this.ns.scriptKill('share.js', host);

            this.ns.exec('share.js', host, threadsAvailable);
            this.sharedRam += threadsAvailable * this.shareScriptRam;
            this.sharedThreads += threadsAvailable;
        }
    }

    private countThreads(): number {
        let threads = 0;
        for (const [host, server] of this.serverList.servers) {
            let serverRam = this.ns.getServerMaxRam(host);
            if (host === 'home') {
                serverRam -= 64;
            }
            threads += this.maxHostThreads(host);
        }

        return threads;
    }

    private maxHostThreads(host: string): number {
        let serverRam = this.ns.getServerMaxRam(host);
        if (host === 'home') {
            serverRam -= 64;
        }

        if (serverRam < this.shareScriptRam) {
            return 0;
        }

        return Math.floor(serverRam / this.shareScriptRam);
    }

    private countRam(): number {
        let ram = 0;
        for (const [host, server] of this.serverList.servers) {
            let serverRam = this.ns.getServerMaxRam(host);
            if (host === 'home') {
                serverRam -= 64;
            }
            ram += serverRam;
        }

        return ram;
    }
}