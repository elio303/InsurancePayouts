import ExcelJS from 'exceljs';
import * as excelConstants from '@/app/constants/excelConstants';

const convert = async (jsons: { [key: string]: any[] }): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();

    Object.keys(jsons).forEach(sheetName => {
        const json = jsons[sheetName];
        const worksheet = workbook.addWorksheet(sheetName);

        const columns = Object.keys(json[0]);
        worksheet.columns = columns.map(col => ({ header: col, key: col, width: 20 }));

        json.forEach(row => worksheet.addRow(row));

        formatWorkSheet(worksheet, columns, json.length);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
};

const formatWorkSheet = (worksheet: ExcelJS.Worksheet, columns: string[], rowCount: number) => {
    const headerRow = worksheet.getRow(1);
    colorHeaderRow(headerRow);

    let previousRow = null;
    let alternator = 0;
    for (let rowIndex = 2; rowIndex <= rowCount + 1; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const isEvenRow = alternator % 2 === 0;

        const isPreviousRowEmpty = !previousRow?.getCell(1).value;
        const isCurrentRowFilled = row?.getCell(1).value;
        const isCurrentRowFirst = rowIndex === 2;

        if (isPreviousRowEmpty && isCurrentRowFilled && !isCurrentRowFirst) {
            colorHeaderRow(row);
            alternator = 0;
        } else if (isCurrentRowFilled) {
            if (isEvenRow) {
                colorEvenRow(row);
            } else {
                colorOddRow(row);
            }
            alternator++;
        }

        previousRow = row;
    }

    Object.keys(excelConstants.columnFormatMapping).forEach((columnName: string) => {
        const columnIndex = columns.indexOf(columnName);
        const format = excelConstants.columnFormatMapping[columnName];
        if (columnIndex !== -1) {
            formatColumn(worksheet, columnIndex + 1, rowCount, format); 
        }
    });

    setUniformColumnWidths(worksheet);
};

const colorRow = (row: ExcelJS.Row, cellColor: string, fontColor: string) => {
    row.eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cellColor } 
        };
        cell.font = { bold: true, color: { argb: fontColor } }; 
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
};

const colorHeaderRow = (row: ExcelJS.Row) => {
    colorRow(row, excelConstants.cellColors.darkBlue, excelConstants.fontColors.white);
};

const colorEvenRow = (row: ExcelJS.Row) => {
    colorRow(row, excelConstants.cellColors.lightestBlue, excelConstants.fontColors.black);
};

const colorOddRow = (row: ExcelJS.Row) => {
    colorRow(row, excelConstants.cellColors.lighterBlue, excelConstants.fontColors.black);
};

const formatColumn = (worksheet: ExcelJS.Worksheet, columnIndex: number, rowCount: number, format: string) => {
    for (let row = 1; row <= rowCount + 1; row++) { 
        const cell = worksheet.getRow(row).getCell(columnIndex);
        cell.numFmt = format; 
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
};

const setUniformColumnWidths = (worksheet: ExcelJS.Worksheet): void => {
    let maxContentWidth = 0;

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            maxContentWidth = Math.max(maxContentWidth, String(cell.value).length);
        });
    });

    worksheet.columns.forEach(column => {
        column.width = maxContentWidth + 2;
    });
};

export default {
    convert,
};