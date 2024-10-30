import * as dfd from "danfojs";
import Groupby from "danfojs/dist/danfojs-base/aggregators/groupby";
import { DataFrame } from "danfojs/dist/danfojs-base";
import * as excelConstants from '@/app/constants/excelConstants';

const convert = (dataFrame: dfd.DataFrame): { [key: string]: any[] } => {
    return {
        EarningsReport: createEarningsReportJson(dataFrame),
        ...createAgentJsons(dataFrame),
    };
}

const createAgentJsons = (df: dfd.DataFrame): { [key: string]: any[] } => {
    const groupedSheets: { [key: string]: any[] } = {};
    const grouped: Groupby = df.groupby([excelConstants.columnNames.agent]) as Groupby;
    const uniqueAgents: string[] = Object.keys(grouped.groups);
    uniqueAgents.forEach((agent: string) => {
        const agentGroupDataFrame: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
        groupedSheets[agent] = dfd.toJSON(agentGroupDataFrame) as any[];
    });
    return groupedSheets;
};

const createEarningsReportJson = (df: dfd.DataFrame): any[] => {
    const emptyRowsDf: dfd.DataFrame = createEmptyRows(df);
    const grouped: Groupby = df.groupby([excelConstants.columnNames.agent]) as Groupby;
    const uniqueAgents: string[] = df[excelConstants.columnNames.agent].unique().values;

    uniqueAgents.forEach(agent => {
        const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
        df = dfd.concat({ dfList: [df, emptyRowsDf, agentGroup], axis: 0 }) as DataFrame;
    });

    return dfd.toJSON(df) as any[]; // TODO: Throw when toJSON fails
};

const createEmptyRows = (df: dfd.DataFrame): dfd.DataFrame => {
    const emptyRow = Object.fromEntries(df.columns.map(column => [column, ""]));
    const headerRow = Object.fromEntries(df.columns.map(column => [column, column]));
    return new dfd.DataFrame([emptyRow, emptyRow, emptyRow, headerRow]);
};

export default {
    convert,
};
