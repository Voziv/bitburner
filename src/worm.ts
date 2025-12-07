import {NS} from '@ns';

export async function main(ns: NS): Promise<void> {
    const host = ns.args[0].toString();

    if (!ns.hasRootAccess(host)) {
        let portsOpen = 0;
        // If we have the BruteSSH.exe program, use it to open the SSH Port
        // on the target server
        if (ns.fileExists('BruteSSH.exe', 'home')) {
            portsOpen++;
            ns.brutessh(host);
        }

        // If we have the BruteSSH.exe program, use it to open the SSH Port
        // on the target server
        if (ns.fileExists('FTPCrack.exe', 'home')) {
            portsOpen++;
            ns.ftpcrack(host);
        }

        if (ns.getServerNumPortsRequired(host) <= portsOpen) {
            ns.nuke(host);
        }
    }


    const hosts = ns.scan(ns.args[0].toString());


}