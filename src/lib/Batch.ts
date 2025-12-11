import { NS } from '@ns';


export class Batch {
    private ns: NS;
    private target: string;


    constructor(ns: NS, target: string) {
        this.ns = ns;
        this.target = target;
    }

    public async onTick() {

    }

    calculateRam() {

    }
}