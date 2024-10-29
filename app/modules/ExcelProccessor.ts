
"use client";

import * as dfd from "danfojs";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import Groupby from "danfojs/dist/danfojs-base/aggregators/groupby";
import { DataFrame } from "danfojs/dist/danfojs-base";
import * as excelConstants from '../constants/excelConstants';

const createExcelFile = (dataFrame: dfd.DataFrame) => {
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    createGroupedSheets(workbook, dataFrame);
    createEarningsReportSheet(workbook, dataFrame);

    XLSX.writeFile(workbook, "grouped_data.xlsx");
};

const getColumnIndex = (columnName: string, df: dfd.DataFrame): number => {
    return df.columns.findIndex(currentColumnName => currentColumnName === columnName);
};

const createGroupedSheets = (workbook: XLSX.WorkBook, df: dfd.DataFrame): void => {
    const grouped: Groupby = df.groupby([excelConstants.columnNames.agent]) as Groupby;
    const uniqueAgents: string[] = df[excelConstants.columnNames.agent].unique().values;

    uniqueAgents.forEach(agent => {
        const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
        const agentGroupJson = dfd.toJSON(agentGroup);
        if (Array.isArray(agentGroupJson)) {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(agentGroupJson);
        formatColumn(df, worksheet, excelConstants.columnNames.commissionOwed, excelConstants.excelCellFormats.money);
        formatColumn(df, worksheet, excelConstants.columnNames.commissionPercentage, excelConstants.excelCellFormats.percent);
        formatColumn(df, worksheet, excelConstants.columnNames.premium, excelConstants.excelCellFormats.money);
        formatColumn(df, worksheet, excelConstants.columnNames.commissionRatePercentage, excelConstants.excelCellFormats.percent);
        formatColumn(df, worksheet, excelConstants.columnNames.grossCommissionEarned, excelConstants.excelCellFormats.money);
        formatColumn(df, worksheet, excelConstants.columnNames.participationPercentage, excelConstants.excelCellFormats.percent);
        
        resizeColumns(worksheet, agentGroupJson, Object.keys(agentGroupJson[0]));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, agent);
        }
    });
};

const createEarningsReportSheet = (workbook: XLSX.WorkBook, df: dfd.DataFrame): void => {
    const emptyRowsDf: dfd.DataFrame = createEmptyRows(df);
    const grouped: Groupby = df.groupby([excelConstants.columnNames.agent]) as Groupby;
    const uniqueAgents: string[] = df[excelConstants.columnNames.agent].unique().values;

    uniqueAgents.forEach(agent => {
        const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
        df = dfd.concat({ dfList: [df, emptyRowsDf, agentGroup], axis: 0 }) as DataFrame;
    });

    const earningsReportJson = dfd.toJSON(df);
    if (Array.isArray(earningsReportJson)) {
        const earningsReportSheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(earningsReportJson);

        formatColumn(df, earningsReportSheet, excelConstants.columnNames.commissionOwed, excelConstants.excelCellFormats.money);
        formatColumn(df, earningsReportSheet, excelConstants.columnNames.commissionPercentage, excelConstants.excelCellFormats.percent);
        formatColumn(df, earningsReportSheet, excelConstants.columnNames.premium, excelConstants.excelCellFormats.money);
        formatColumn(df, earningsReportSheet, excelConstants.columnNames.commissionRatePercentage, excelConstants.excelCellFormats.percent);
        formatColumn(df, earningsReportSheet, excelConstants.columnNames.grossCommissionEarned, excelConstants.excelCellFormats.money);
        formatColumn(df, earningsReportSheet, excelConstants.columnNames.participationPercentage, excelConstants.excelCellFormats.percent);
        
        resizeColumns(earningsReportSheet, earningsReportJson, Object.keys(earningsReportJson[0]));
        
        const formattedDate: string = dayjs().format(excelConstants.earningsReportName.dateFormat);
        XLSX.utils.book_append_sheet(workbook, earningsReportSheet, `${excelConstants.earningsReportName.prefix}_${formattedDate}`);
        workbook.SheetNames = [workbook.SheetNames.pop() as string, ...workbook.SheetNames];
    }
};

const formatColumn = (df: dfd.DataFrame, sheet: XLSX.WorkSheet, columnName: string, format: string) => {
    const rowCount = df.values.length;
    const columnIndex = getColumnIndex(columnName, df);

        for (let row = 1; row <= rowCount + 1; row++) {
            const cell = XLSX.utils.encode_cell({ c: columnIndex, r: row });
            if (sheet[cell]) {
                sheet[cell].z = format;
            }
        }
};

const createEmptyRows = (df: dfd.DataFrame): dfd.DataFrame => {
    const emptyRow = Object.fromEntries(df.columns.map(column => [column, ""]));
    const headerRow = Object.fromEntries(df.columns.map(column => [column, column]));
    return new dfd.DataFrame([emptyRow, emptyRow, emptyRow, headerRow]);
    };

    const resizeColumns = (worksheet: XLSX.WorkSheet, jsonData: any[], headers: string[]) => {
    let maxColumnWidth = 0;

    headers.forEach(header => {
        maxColumnWidth = Math.max(maxColumnWidth, header.length);
    });

    jsonData.forEach(row => {
        Object.values(row).forEach(cellValue => {
            const cellLength = cellValue?.toString().length || 0;
            maxColumnWidth = Math.max(maxColumnWidth, cellLength);
        });
    });

    worksheet["!cols"] = headers.map(() => ({ wpx: (maxColumnWidth + 2) * 7 }));
};

export default createExcelFile;
