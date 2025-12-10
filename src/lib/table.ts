import {NS} from '@ns';

export function formatAsTable(ns: NS, headers: string[], data: string[][]) {
    const rows = convertToRows(ns, headers, data);

    for (const row of rows) {
        ns.print(row);
    }
}

export function tFormatAsTable(ns: NS, headers: string[], data: string[][]) {
    const rows = convertToRows(ns, headers, data);

    for (const row of rows) {
        ns.tprint(row);
    }
}

function convertToRows(ns: NS, headers: string[], data: string[][]): string[] {
    const rows: string[] = []
    const colWidths = calculateColWidths(ns, headers, data);

    const header = formatRow(headers, colWidths);
    rows.push(header);
    rows.push(''.padEnd(header.length, '='));

    for (let i = 0; i < data.length; i++) {
        rows.push(formatRow(data[i], colWidths));
    }

    return rows;
}

function formatRow(rowData: string[], colWidths: number[]): string {
    let row = '';

    for (let i = 0; i < rowData.length; i++) {
        row += '| ' + rowData[i].padEnd(colWidths[i]) + ' '
    }

    if (rowData.length < colWidths.length) {
        const extraColumns = colWidths.length - rowData.length;
        for (let i = 0; i < extraColumns; i++) {
            row += '| ' + `-`.padEnd(colWidths[i]) + ' '
        }
    }

    row += '|'

    return row;
}

function calculateColWidths(ns: NS, headers: string[], rows: string[][]): number[] {
    const colWidths = [];
    let maxColumns = headers.length;

    for (const row of rows) {
        if (row.length > maxColumns) {
            maxColumns = row.length;
        }
    }

    for (let i = 0; i < maxColumns; i++) {
        colWidths.push(1);
    }

    for (let i = 0; i < headers.length; i++) {
        colWidths[i] = headers[i].length;
    }

    for (const row of rows) {
        for (let i = 0; i < row.length; i++) {
            if (row[i].length > colWidths[i]) {
                colWidths[i] = row[i].length;
            }
        }
    }

    return colWidths;
}