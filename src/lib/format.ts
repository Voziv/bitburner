import { NS } from '@ns';


export function printStats(ns: NS, stats: Map<string, any>) {
    let keyPad = 0;
    let valPad = 0;
    for (const [ key, value ] of stats) {
        if (key.length > keyPad) {
            keyPad = key.length;
        }
        if (value.length > valPad) {
            valPad = value.length;
        }
    }

    for (const [ key, value ] of stats) {
        ns.print(`${key.padEnd(keyPad)}: ${`${value}`.padEnd(valPad)}`);
    }
}

export function tPrintStats(ns: NS, stats: Map<string, String>) {
    let keyPad = 0;
    let valPad = 0;
    for (const [ key, value ] of stats) {
        if (key.length > keyPad) {
            keyPad = key.length;
        }
        if (value.length > valPad) {
            valPad = value.length;
        }
    }

    for (const [ key, value ] of stats) {
        ns.tprint(`${key.padEnd(keyPad)}: ${`${value}`.padEnd(valPad)}`);
    }
}
