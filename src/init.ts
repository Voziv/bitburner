import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
    ns.exec('hacker.ts', 'home');
    ns.exec('servers.ts', 'home');
    ns.exec('train.ts', 'home');

}