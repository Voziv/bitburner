import { NS } from '@ns';
import { NEUROFLUX_GOVERNOR, purchaseNeuroFlux } from '/buy-augs';


export async function main(ns: NS): Promise<void> {
    const levelsPurchased = purchaseNeuroFlux(ns);
    ns.tprint(`Bought ${levelsPurchased} levels of ${NEUROFLUX_GOVERNOR}`);
}