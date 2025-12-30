import { NS } from '@ns';
import { printStats } from '/lib/format';
import { Spinner } from '/lib/Spinner';


export const LINE_HEIGHT = 24;
export const TITLE_HEIGHT = 33;


export interface UpdateLogOpts {
    maxWidth?: number;
    preProcessor?: Function;
    title?: string;
    updateRate?: number;
}

const defaultOpts: UpdateLogOpts = {
    maxWidth: 600,
    updateRate: 250,
    title: 'Default Title',
};


export function initLogRenderer(ns: NS, lines: Map<string, any>, opts?: UpdateLogOpts) {
    opts = { ...defaultOpts, ...opts };

    ns.disableLog('ALL');
    ns.ui.openTail();
    ns.ui.resizeTail(opts.maxWidth!, TITLE_HEIGHT + LINE_HEIGHT);

    const spinner = new Spinner();


    const intervalId = setInterval(() => {
        if (opts?.preProcessor) {
            opts.preProcessor(ns, lines);
        }

        ns.clearLog();
        const largestLine = printStats(ns, lines);

        ns.ui.setTailTitle(`[${spinner.next()}] ${opts!.title}`);
        ns.ui.resizeTail(Math.min(opts!.maxWidth!, largestLine * 5), TITLE_HEIGHT + (LINE_HEIGHT * lines.size));
        ns.ui.renderTail();
    }, opts.updateRate);

    ns.atExit(() => {
        clearInterval(intervalId);
    }, 'ui.updateLog.cleanup');
}
