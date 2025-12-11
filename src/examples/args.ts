import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
    ns.tprint('Arg Test Program');
    ns.tprint('----------------');
    for (const nsKey in ns.args) {
        ns.tprint(`Arg #${nsKey} = ${ns.args[nsKey]}`);
    }
}
