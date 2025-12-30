import { NS } from '@ns';
import { LINE_HEIGHT, TITLE_HEIGHT } from '/lib/ui';
import { printStats } from '/lib/format';
import { Spinner } from '/lib/Spinner';


// Exported so that servers.ts can keep this in mind when reserving ram on home.
// Order matters as the scripts will execute in this exact order.
export const AUTOPLAY_SCRIPTS = [
    'buy-home-upgrades.ts',
    'buy-programs.ts',
    'spider.ts',
    'buy-servers.ts',
    'backdoor.ts',
    'destroy.ts',
    'buy-augs.ts',
];

const stats = new Map<string, any>();

const WINDOW_WIDTH = 400;

const spinner = new Spinner();

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * 1));
    ns.print('Singularity is booting up');

    const intervalId = setInterval(updateLog(ns), 250);

    ns.atExit(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    });

    // Initial Loop first
    await loop(ns);

    // TODO: Startup other scripts like the hacker script.

    stats.set('Action', `Sleeping for 60s`);
    await ns.asleep(60000);
    while (true) {
        await loop(ns);

        stats.set('Action', `Sleeping for 60s`);
        await ns.asleep(60000);
    }
}


async function loop(ns: NS) {
    for (const script of AUTOPLAY_SCRIPTS) {
        await runAndWait(ns, script);
    }
}

export async function runAndWait(ns: NS, script: string, maxAttempts = 50) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const pid = ns.exec(script, 'home');
        if (pid) {
            while (ns.getRunningScript(pid, 'home')) {
                stats.set('Action', `Running ${script}`);
                await ns.asleep(1000);
            }
            break;
        }
        await ns.sleep(500);
        attempts++;
    }

}

function updateLog(ns: NS) {
    return () => {
        ns.clearLog();
        ns.ui.setTailTitle(`[${spinner.next()}] Autoplay`);

        ns.ui.resizeTail(WINDOW_WIDTH, TITLE_HEIGHT + (LINE_HEIGHT * stats.size));
        printStats(ns, stats);
        ns.ui.renderTail();
    };
}