import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
    ns.exec('autoplay.ts', 'home', { preventDuplicates: true});
    ns.exec('hacker.ts', 'home', { preventDuplicates: true});
    ns.exec('train.ts', 'home', { preventDuplicates: true});
}