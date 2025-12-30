import { NS } from '@ns';
import { getBotnet } from '/lib/servers';


/**
 * Test script to see the output of things
 */
export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    ns.ui.clearTerminal();

    const botnet = getBotnet(ns);
    ns.tprint(JSON.stringify(botnet, undefined, 4));
}

