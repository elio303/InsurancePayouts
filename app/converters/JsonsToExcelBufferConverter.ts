import * as XLSX from "xlsx";
import * as excelConstants from '../constants/excelConstants';

const convert = async (jsons: { [key: string]: any[] }): Promise<Buffer> => {
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    Object.keys(jsons).forEach(sheetName => {
        const json = jsons[sheetName];
        const workSheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
        const columns = Object.keys(json[0]);
        const rowCount = json.length;
        formatWorkSheet(workSheet, columns, rowCount);
        XLSX.utils.book_append_sheet(workbook, workSheet, sheetName);
    });

    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
};

const formatWorkSheet = (workSheet: XLSX.WorkSheet, columns: string[], rowCount: number) => {
    Object.keys(excelConstants.columnFormatMapping).forEach((columnName: string) => {
        console.log(columns);
        const columnIndex = columns.indexOf(columnName);
        const format = excelConstants.columnFormatMapping[columnName];
        formatColumn(
            workSheet,
            columnIndex,
            rowCount,
            format
        );
    });
    setCellWidths(workSheet)
};

const formatColumn = (workSheet: XLSX.WorkSheet, columnIndex: number, rowCount: number, format: string) => {
    for (let row = 1; row <= rowCount + 1; row++) {
        const cell = XLSX.utils.encode_cell({ c: columnIndex, r: row });
        if (workSheet[cell]) {
            workSheet[cell].z = format;
        }
    }
};

const setCellWidths = (workSheet: XLSX.WorkSheet): void => {
    let maxContentWidth = 0;

    Object.keys(workSheet).forEach(cellAddress => {
        if (cellAddress[0] === '!') return;
        const cell = workSheet[cellAddress];
        if (cell && cell.v != null) {
            maxContentWidth = Math.max(maxContentWidth, String(cell.v).length);
        }
    });

    const totalColumns = XLSX.utils.decode_range(workSheet['!ref'] as string).e.c + 1;

    workSheet['!cols'] = Array.from(
        { length: totalColumns },
        () => ({ wch: maxContentWidth + 2 })
    );
};

export default {
    convert,
};
