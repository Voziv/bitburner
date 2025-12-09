import { NS } from '@ns';
import React from '@react';

interface IMyContentProps {
    name: string
}

const MyContent = ({name}: IMyContentProps) => <span>Hello {name}</span>;

export async function main(ns: NS){
    // Shows up in the log tail of this script
    ns.printRaw(<MyContent name="Your name"></MyContent>);
    while (true) {
        await ns.sleep(60000);
    }
}