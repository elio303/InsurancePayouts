
import * as dfd from "danfojs";
import * as excelConstants from '../constants/excelConstants';
import {
    productNameMapping,
    productAgentCommissionMapping,
    excludedAgents,
    annuityCommissionPercentage,
    productTypes,
} from '../providers/MappingsProvider';

interface Commission {
  percentage: number;
  amount: number;
}

const process = (dataFrame: dfd.DataFrame): dfd.DataFrame => {
    let modifiedDataFrame: dfd.DataFrame = loadAndCleanData(dataFrame, productNameMapping, productTypes);
    modifiedDataFrame = fillCommission(
        modifiedDataFrame,
        productAgentCommissionMapping,
        excludedAgents,
        annuityCommissionPercentage,
        productTypes
    );
    modifiedDataFrame = cleanCompensationType(modifiedDataFrame);
    return modifiedDataFrame;
};

const loadAndCleanData = (
    dataFrame: dfd.DataFrame,
    productNameMapping: { [key: string]: string },
    productTypes: { [key: string]: string },
): dfd.DataFrame => {
    let modifiedDataFrame = new dfd.DataFrame(dataFrame.values.slice(5, -5), { columns: dataFrame.values[4] as any })
    modifiedDataFrame = modifiedDataFrame.drop({ columns: excelConstants.columnsToDrop });
    modifiedDataFrame.rename(excelConstants.renameMapping, { inplace: true });
    modifiedDataFrame = modifiedDataFrame.loc({ columns: excelConstants.columnsToKeep });
    modifiedDataFrame = mapProductNames(modifiedDataFrame, productNameMapping, productTypes);
    modifiedDataFrame = addEmptyColumns(modifiedDataFrame, excelConstants.newColumns);
    return modifiedDataFrame;
};

const mapProductNames = (
    df: dfd.DataFrame,
    productNameMapping: { [key: string]: string },
    productTypes: { [key: string]: string }
): dfd.DataFrame => {
    df[excelConstants.columnNames.productName] = df[excelConstants.columnNames.productName].map((value: string, index: number) => {
        if (productNameMapping[value]) {
            return productNameMapping[value];
        }

        if (df[excelConstants.columnNames.productType].values[index] === productTypes.annuity) {
            return value;
        }

        return productTypes.default;
    });
    return df;
};

const addEmptyColumns = (df: dfd.DataFrame, newColumns: string[]): dfd.DataFrame => {
    newColumns.forEach(column => {
        const emptyArray: string[] = new Array(df.shape[0]).fill("");
        df.addColumn(column, emptyArray, { inplace: true });
    });
    return df;
};

const cleanCompensationType = (df: dfd.DataFrame) => {
    const compensationTypes = df.values.map((_, i) => {
        const row = df.iloc({ rows: [i] }).values[0] as any[];
        const compensationTypeIndex = getColumnIndex(excelConstants.columnNames.compensationType, df);
        const sanitized = row[compensationTypeIndex].replace("Compensation", "");
        return sanitized;
    });

    df.addColumn(excelConstants.columnNames.compensationType, compensationTypes, { inplace: true });

    return df;
}

const fillCommission = (
    df: dfd.DataFrame,
    productAgentCommissionMapping: { [key: string]: { [key: string]: number } },
    excludedAgents: string[],
    annuityCommissionPercentage: number,
    productTypes: { [key: string]: string },
): dfd.DataFrame => {
    const indices = {
        productType: getColumnIndex(excelConstants.columnNames.productType, df),
        productName: getColumnIndex(excelConstants.columnNames.productName, df),
        agentName: getColumnIndex(excelConstants.columnNames.agent, df),
        participation: getColumnIndex(excelConstants.columnNames.participationPercentage, df),
        premium: getColumnIndex(excelConstants.columnNames.premium, df),
        commissionPercentage: getColumnIndex(excelConstants.columnNames.commissionPercentage, df),
        commissionOwed: getColumnIndex(excelConstants.columnNames.commissionOwed, df),
    };

    const commissions: Commission[] = df.values.map((_, i) => {
        const row = df.iloc({ rows: [i] }).values[0] as any[];
        const { productType, productName, agent, participation, premium } = {
            productType: row[indices.productType],
            productName: row[indices.productName],
            agent: row[indices.agentName],
            participation: row[indices.participation],
            premium: row[indices.premium]
        };

        if (excludedAgents.includes(agent.toUpperCase())) {
            return { percentage: 0, amount: 0 };
        }

        switch (productType) {
            case productTypes.life:
                return calculateLifeCommission(productAgentCommissionMapping, productName, agent, participation, premium);
            case productTypes.annuity:
                return calculateAnnuityCommission(annuityCommissionPercentage, participation, premium);
            default:
                return { percentage: 0, amount: 0 };
        }
    });

    df.addColumn(excelConstants.columnNames.commissionPercentage, commissions.map(c => c.percentage), { inplace: true });
    df.addColumn(excelConstants.columnNames.commissionOwed, commissions.map(c => c.amount), { inplace: true });

    return df;
};

const calculateLifeCommission = (mapping: { [key: string]: { [key: string]: number } }, productName: string, agent: string, participation: number, premium: number): Commission => {
    const mappedCommissionPercentage = mapping[productName]?.[agent];
    if (mappedCommissionPercentage) {
        return {
        percentage: mappedCommissionPercentage / 100,
        amount: (mappedCommissionPercentage / 100) * participation * premium
        };
    }
    return { percentage: 0, amount: 0 };
};

const calculateAnnuityCommission = (commissionPercentage: number, participation: number, premium: number): Commission => {
    return {
        percentage: commissionPercentage / 100,
        amount: (commissionPercentage / 100) * participation * premium
    };
};

const getColumnIndex = (columnName: string, df: dfd.DataFrame): number => {
    return df.columns.findIndex(currentColumnName => currentColumnName === columnName);
};

export default {
    process,
};
