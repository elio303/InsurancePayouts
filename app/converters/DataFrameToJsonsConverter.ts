import * as dfd from 'danfojs';
import Groupby from 'danfojs/dist/danfojs-base/aggregators/groupby';
import { DataFrame } from 'danfojs/dist/danfojs-base';
import * as excelConstants from '@/app/constants/excelConstants';
import { hardcodedAgents } from '../providers/MappingsProvider';

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
        df = dfd.concat({ dfList: [agentGroupDataFrame, createEmptyRowDf(df)], axis: 0 }) as DataFrame;
        groupedSheets[agent] = dfd.toJSON(df) as any[];
    });
    hardcodedAgents.forEach((agent: string) => {
        if (!Object.keys(groupedSheets).includes(agent)) {
            groupedSheets[agent] = dfd.toJSON(new dfd.DataFrame([], { columns: df.columns })) as any[];
        }
    });
    return groupedSheets;
};

const createEarningsReportJson = (df: dfd.DataFrame): any[] => {
    const emptyRowsDf: dfd.DataFrame = createEmptyRowsDf(df);
    const grouped: Groupby = df.groupby([excelConstants.columnNames.agent]) as Groupby;
    const uniqueAgents: string[] = df[excelConstants.columnNames.agent].unique().values;

    uniqueAgents.forEach(agent => {
        const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
        df = dfd.concat({ dfList: [df, emptyRowsDf, agentGroup], axis: 0 }) as DataFrame;
    });
    df = dfd.concat({ dfList: [df, createEmptyRowDf(df)], axis: 0 }) as DataFrame;

    return dfd.toJSON(df) as any[];
};

const createEmptyRowsDf = (df: dfd.DataFrame): dfd.DataFrame => {
    const emptyRow = createEmptyRow(df);
    const headerRow = Object.fromEntries(df.columns.map(column => [column, column]));
    return new dfd.DataFrame([emptyRow, emptyRow, emptyRow, headerRow]);
};

const createEmptyRowDf = (df: dfd.DataFrame): dfd.DataFrame => {
    return new dfd.DataFrame([createEmptyRow(df)]);
};

const createEmptyRow = (df: dfd.DataFrame): { [key:string]: string } => {
    return Object.fromEntries(df.columns.map(column => [column, '']));
};

export default {
    convert,
};
