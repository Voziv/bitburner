import {NS} from '@ns';
import {Hacker} from '/lib/Hacker';

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');
    const hacker = new Hacker(ns);
    await hacker.run();
}