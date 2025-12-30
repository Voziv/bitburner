import { NS } from '@ns';
import { initLogRenderer, UpdateLogOpts } from '/lib/ui';


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

const lines = new Map<string, any>();

const WINDOW_WIDTH = 400;


export async function main(ns: NS): Promise<void> {
    const sleepMs = 20_000;
    const sleepMsString = ns.tFormat(sleepMs);

    lines.set('Action', `Booting up`);

    initLogRenderer(ns, lines, { preProcessor: updateLines });

    // Initial Loop first
    await loop(ns);

    // TODO: Startup other scripts like the hacker script.

    lines.set('Action', `Sleeping for ${sleepMsString}`);
    await ns.asleep(sleepMs);
    while (true) {
        await loop(ns);

        lines.set('Action', `Sleeping for ${sleepMsString}`);
        await ns.asleep(sleepMs);
    }
}


async function loop(ns: NS) {
    for (const script of AUTOPLAY_SCRIPTS) {
        if (ns.getScriptRam(script, 'home') > 32 && ns.getServerMaxRam('home') < 128) continue;
        await runAndWait(ns, script);
    }
}

export async function runAndWait(ns: NS, script: string, maxAttempts = 50) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const pid = ns.exec(script, 'home');
        if (pid) {
            while (ns.getRunningScript(pid, 'home')) {
                lines.set('Action', `Running ${script}`);
                await ns.asleep(1000);
            }
            break;
        }
        await ns.sleep(500);
        attempts++;
    }

}

function updateLines(ns: NS, lines: Map<string, any>, opts: UpdateLogOpts) {
    opts.title = `Autoplay ${Date.now()}`;
    lines.set('Now', Date.now());
}