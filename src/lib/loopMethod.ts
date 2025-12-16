// private async hackTarget(target: string) {
//     const growParts = 80;
//     const weakenParts = 40;
//     const hackParts = 1;
//     const totalParts = hackParts + growParts + weakenParts;
//     const growPercent = growParts / totalParts;
//     const weakenPercent = weakenParts / totalParts;
//     const hackPercent = hackParts / totalParts;
//
//     const totalThreads = this.countTotalThreads();
//     const targetGrowThreads = Math.floor(totalThreads * growPercent);
//     const targetWeakenThreads = Math.floor(totalThreads * weakenPercent);
//     const targetHackThreads = Math.floor(totalThreads * hackPercent);
//     let totalGrowThreads = 0;
//     let totalWeakenThreads = 0;
//     let totalHackThreads = 0;
//
//     for (const [ host, server ] of this.serverList.servers) {
//         let threadsAvailable = this.countTotalThreadsOnHost(host);
//         if (threadsAvailable < 1) continue;
//
//
//         if (host !== 'home') {
//             // TODO: Check hashes and only copy when different?
//             this.ns.scp('hack.js', host, 'home');
//         }
//
//         this.ns.scriptKill('hack.js', host);
//
//         /**
//          * WEAKEN
//          */
//         while (threadsAvailable > 0) {
//             const delay = Math.floor(Math.random() * 400) + 100;
//             if (totalWeakenThreads < targetWeakenThreads) {
//                 const threads = Math.min(Math.min(threadsAvailable, targetWeakenThreads - totalWeakenThreads), MAX_THREADS);
//                 this.ns.exec('hack.js', host, {
//                     threads,
//                     ramOverride: HACK_SCRIPT_RAM,
//                 }, 'weaken-loop', target, delay);
//                 totalWeakenThreads += threads;
//                 threadsAvailable -= threads;
//             } else {
//                 break;
//             }
//         }
//
//         /**
//          * GROW
//          */
//         while (threadsAvailable > 0) {
//             const delay = Math.floor(Math.random() * 400) + 100;
//             if (totalGrowThreads < targetGrowThreads) {
//                 const threads = Math.min(Math.min(threadsAvailable, targetGrowThreads - totalGrowThreads), MAX_THREADS);
//                 this.ns.exec('hack.js', host, {
//                     threads,
//                     ramOverride: HACK_SCRIPT_RAM,
//                 }, 'grow-loop', target, delay);
//                 totalGrowThreads += threads;
//                 threadsAvailable -= threads;
//             } else {
//                 break;
//             }
//         }
//
//         /**
//          * HACK
//          */
//         while (threadsAvailable > 0) {
//             const delay = Math.floor(Math.random() * 400) + 100;
//             if (totalHackThreads < targetHackThreads) {
//                 const threads = Math.min(Math.min(threadsAvailable, targetHackThreads - totalHackThreads), MAX_THREADS);
//                 this.ns.exec('hack.js', host, {
//                     threads,
//                     ramOverride: HACK_SCRIPT_RAM,
//                 }, 'hack-loop', target, delay);
//                 totalHackThreads += threads;
//                 threadsAvailable -= threads;
//             } else {
//                 break;
//             }
//         }
//     }
//
//     this.hackStats.set('Threads', `${this.ns.formatNumber(totalHackThreads + totalGrowThreads + totalWeakenThreads)} / ${this.ns.formatNumber(totalThreads)}`);
//     this.hackStats.set('HGW', `${'Hack'.padEnd(8)} / ${'Grow'.padEnd(8)} / ${'Weaken'.padEnd(8)}`);
//     this.hackStats.set('H/G/W %', `${(this.ns.formatNumber(hackPercent * 100) + '%').padEnd(8)} / ${(this.ns.formatNumber(growPercent * 100) + '%').padEnd(8)} / ${(this.ns.formatNumber(weakenPercent * 100) + '%').padEnd(8)}`);
//     this.hackStats.set('H/G/W Threads', `${this.ns.formatNumber(totalHackThreads, 0).padEnd(8)} / ${this.ns.formatNumber(totalGrowThreads, 0).padEnd(8)} / ${this.ns.formatNumber(totalWeakenThreads, 0).padEnd(8)}`);
// }