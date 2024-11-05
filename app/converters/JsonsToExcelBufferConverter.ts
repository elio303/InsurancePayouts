import ExcelJS from 'exceljs';
import * as excelConstants from '@/app/constants/excelConstants';

const convert = async (jsons: { [key: string]: any[] }): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();

    Object.keys(jsons).forEach(sheetName => {
        const json = jsons[sheetName];
        const worksheet = workbook.addWorksheet(sheetName);

        const columns = Object.values(excelConstants.columnNames);
        worksheet.columns = columns.map(col => ({ header: col, key: col, width: 20 }));

        json.forEach(row => worksheet.addRow(row));

        formatWorkSheet(worksheet, json.length);
        
        worksheet.views = [
            {
                state: 'frozen',
                xSplit: 0,
                ySplit: 1,
                topLeftCell: 'A2',
                activeCell: 'A2'
            }
        ];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
};

const formatWorkSheet = (worksheet: ExcelJS.Worksheet, rowCount: number) => {
    formatRows(worksheet, rowCount);
    formatColumns(worksheet);
};

const formatColumns = (worksheet: ExcelJS.Worksheet) => {
    Object.keys(excelConstants.columnFormatMapping).forEach((columnName: string) => {
        const format = excelConstants.columnFormatMapping[columnName];
        const column = worksheet.getColumn(columnName);
        formatColumn(column, format); 
    });

    setUniformColumnWidths(worksheet);
    formatGapColumn(worksheet.getColumn(excelConstants.columnNames.gap));

    worksheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
        centerColumn(column);
    });
};

const formatRows = (worksheet: ExcelJS.Worksheet, rowCount: number) => {
    let previousRow = null;
    let alternator = 0;
    let lastHeaderRow = 1;

    for (let rowIndex = 1; rowIndex <= rowCount + 1; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const isEvenRow = alternator % 2 === 0;

        const isPreviousRowEmpty = !previousRow?.getCell(1).value;
        const isCurrentRowFilled = row?.getCell(1).value;

        if (isPreviousRowEmpty && isCurrentRowFilled) {
            formatHeaderRow(row);
            alternator = 0;
            lastHeaderRow = rowIndex;
        } else if (isCurrentRowFilled && isEvenRow) {
            formatEvenRow(row);
            alternator++;
        } else if (isCurrentRowFilled) {
            formatOddRow(row);
            alternator++;
        } else if (!isPreviousRowEmpty) {
            row.eachCell((cell, columnIndex) => {
                const columnName: string = worksheet.getRow(1).getCell(columnIndex).value as string;
                if (excelConstants.columnFormatMapping[columnName] === excelConstants.excelCellFormats.money) {
                    const columnLetter = cell.address[0];
                    cell.value = { formula: `=SUM(${columnLetter}${lastHeaderRow + 1}:${columnLetter}${rowIndex - 1})` };
                }
            }); 
        }

        previousRow = row;
    }
};

const formatGapColumn = (column: ExcelJS.Column) => {
    colorColumn(column, excelConstants.cellColors.navy);
    centerColumn(column);
    column.width = excelConstants.gapColumnWidth;
};

const colorColumn = (column: ExcelJS.Column, cellColor: string) => {
    column.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cellColor }, 
    }
};

const centerColumn = (column: ExcelJS.Column | Partial<ExcelJS.Column>) => {
    column.alignment = { vertical: 'middle', horizontal: 'center' };
};

const formatHeaderRow = (row: ExcelJS.Row) => {
    colorRow(row, excelConstants.cellColors.darkBlue, excelConstants.fontColors.white);
};

const formatEvenRow = (row: ExcelJS.Row) => {
    colorRow(row, excelConstants.cellColors.lightestBlue, excelConstants.fontColors.black);
};

const formatOddRow = (row: ExcelJS.Row) => {
    colorRow(row, excelConstants.cellColors.lighterBlue, excelConstants.fontColors.black);
};

const colorRow = (row: ExcelJS.Row, cellColor: string, fontColor: string) => {
    row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cellColor } 
        };
    row.font = { bold: true, color: { argb: fontColor } }; 
};

const formatColumn = (column: ExcelJS.Column, format: string) => {
    column.numFmt = format;
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