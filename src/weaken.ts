import {NS} from '@ns';

export async function main(ns: NS): Promise<void> {
    const target = ns.args[0].toString();
    const securityThresh = ns.getServerMinSecurityLevel(target);

    while (true) {
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            await ns.weaken(target);
        }
        await ns.sleep(50);
    }
}