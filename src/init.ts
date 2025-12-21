import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
    ns.exec('hacker.js', 'home');
    ns.exec('servers.js', 'home');

}