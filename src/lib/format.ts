import { NS } from '@ns';


export function printStats(ns: NS, stats: Map<string, any>): number {
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

    return  keyPad + valPad + 2;
}

export function tPrintStats(ns: NS, stats: Map<string, String>): number {
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

    return  keyPad + valPad + 2;
}
