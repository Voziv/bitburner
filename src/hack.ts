import {NS} from "@ns";

export async function main(ns: NS): Promise<void> {
    const script = "money.js";
    const target = "n00dles";

    const hosts = [
        "n00dles",
        "foodnstuff",
        "sigma-cosmetics",
        "joesguns",
        "hong-fang-tea",
        "harakiri-sushi",
        // "iron-gym", // Needs an open port to nuke
    ];

    for (const host of hosts) {
        if (!ns.hasRootAccess(host)) {
            ns.nuke(host);
        }
        ns.scp(script, host, "home");
        ns.killall(host);

        const threads = Math.floor(ns.getServerMaxRam(host) / ns.getScriptRam(script));

        ns.tprint(`Running ${script} on ${host} with ${threads} threads.`)

        ns.exec(script, host, threads, target);
    }

}
