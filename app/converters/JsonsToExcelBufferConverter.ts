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
    // Apply blue background to header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFADD8E6' } // Light blue background color
        };
        cell.font = { bold: true, color: { argb: 'FF0000FF' } }; // Set font color to blue and make bold
    });

    Object.keys(excelConstants.columnFormatMapping).forEach((columnName: string) => {
        const columnIndex = columns.indexOf(columnName);
        const format = excelConstants.columnFormatMapping[columnName];
        if (columnIndex !== -1) {
            formatColumn(worksheet, columnIndex + 1, rowCount, format); 
        }
    });

    setUniformColumnWidths(worksheet);
};

const formatColumn = (worksheet: ExcelJS.Worksheet, columnIndex: number, rowCount: number, format: string) => {
    for (let row = 1; row <= rowCount + 1; row++) { 
        const cell = worksheet.getRow(row).getCell(columnIndex);
        cell.numFmt = format; 
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