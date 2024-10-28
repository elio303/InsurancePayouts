
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as dfd from "danfojs";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import Groupby from "danfojs/dist/danfojs-base/aggregators/groupby";
import { DataFrame } from "danfojs/dist/danfojs-base";

interface FileData {
  name: string;
  size: number;
}

interface Mappings {
  columnsToDrop: string[];
  renameMapping: { [key: string]: string };
  columnsToKeep: string[];
  productNameMapping: { [key: string]: string };
  productAgentCommissionMapping: { [key: string]: { [key: string]: number } };
  newColumns: string[];
  annuityCommissionPercentage: number;
  excludedAgents: string[];
}

interface Commission {
  percentage: number;
  amount: number;
}

const Home: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [mappings, setMappings] = useState<Mappings | null>(null);
  const [loadingMappings, setLoadingMappings] = useState<boolean>(true);

  // Fetch mappings on component mount
  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const response = await fetch('/api/getMappings');
        const data = await response.json();
        setMappings(data);
      } catch (error) {
        console.error("Failed to load mappings:", error);
      } finally {
        setLoadingMappings(false);
      }
    };

    fetchMappings();
  }, []);

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (loadingMappings) {
      alert("Please wait until mappings have been loaded!");
      return;
    }

    if (!mappings) {
      alert("Mappings failed to load. Please try again.");
      return;
    }

    const mappedFiles = mapFiles(acceptedFiles);
    setFiles(prevFiles => [...prevFiles, ...mappedFiles]);

    const df: dfd.DataFrame = await loadAndCleanData(acceptedFiles[0], mappings);
    const updatedDf = fillCommission(df, mappings.productAgentCommissionMapping, mappings.excludedAgents, mappings.annuityCommissionPercentage);

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    createGroupedSheets(workbook, updatedDf);
    createEarningsReportSheet(workbook, updatedDf);
    
    XLSX.writeFile(workbook, "grouped_data.xlsx");
  }, [loadingMappings, mappings]);

  // Map accepted files to FileData structure
  const mapFiles = (acceptedFiles: File[]): FileData[] => 
    acceptedFiles.map(file => ({ name: file.name, size: file.size }));

  // Load and clean data from Excel file
  const loadAndCleanData = async (file: File, mappings: Mappings): Promise<dfd.DataFrame> => {
    let df: dfd.DataFrame = await dfd.readExcel(file) as dfd.DataFrame;
    df = new dfd.DataFrame(df.values.slice(2, -2), { columns: df.values[1] as any })
      .drop({ columns: mappings.columnsToDrop });
    df.rename(mappings.renameMapping, { inplace: true });
    df = df.loc({ columns: mappings.columnsToKeep });

    return addEmptyColumns(mapProductNames(df, mappings.productNameMapping), mappings.newColumns);
  };

  // Map product names according to mapping
  const mapProductNames = (df: dfd.DataFrame, productNameMapping: { [key: string]: string }): dfd.DataFrame => {
    df["Product Name"] = df["Product Name"].map((value: string) => productNameMapping[value] || value);
    return df;
  };

  // Add empty columns to DataFrame
  const addEmptyColumns = (df: dfd.DataFrame, newColumns: string[]): dfd.DataFrame => {
    newColumns.forEach(column => {
      const emptyArray: string[] = new Array(df.shape[0]).fill("");
      df.addColumn(column, emptyArray, { inplace: true });
    });
    return df;
  };

  // Fill commission based on the mappings
  const fillCommission = (
    df: dfd.DataFrame,
    productAgentCommissionMapping: { [key: string]: { [key: string]: number } },
    excludedAgents: string[],
    annuityCommissionPercentage: number
  ): dfd.DataFrame => {
    const indices = {
      productType: getColumnIndex("Product Type", df),
      productName: getColumnIndex("Product Name", df),
      agentName: getColumnIndex("Agent", df),
      participation: getColumnIndex("% of particip", df),
      premium: getColumnIndex("Premium Amt", df),
      commissionPercentage: getColumnIndex("Commission %", df),
      commissionOwed: getColumnIndex("Commission Owed", df),
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
        case "Life":
          return calculateLifeCommission(productAgentCommissionMapping, productName, agent, participation, premium);
        case "Annuity":
          return calculateAnnuityCommission(annuityCommissionPercentage, participation, premium);
        default:
          return { percentage: 0, amount: 0 };
      }
    });

    df.addColumn("Commission %", commissions.map(c => c.percentage), { inplace: true });
    df.addColumn("Commission Owed", commissions.map(c => c.amount), { inplace: true });
    
    return df;
  };

  // Calculate commission for Life products
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

  // Calculate commission for Annuity products
  const calculateAnnuityCommission = (commissionPercentage: number, participation: number, premium: number): Commission => {
    return {
      percentage: commissionPercentage / 100,
      amount: (commissionPercentage / 100) * participation * premium
    };
  };

  // Get column index by column name
  const getColumnIndex = (columnName: string, df: dfd.DataFrame): number => {
    return df.columns.findIndex(currentColumnName => currentColumnName === columnName);
  };

  // Create grouped sheets in the workbook
  const createGroupedSheets = (workbook: XLSX.WorkBook, df: dfd.DataFrame): void => {
    const grouped: Groupby = df.groupby(["Agent"]) as Groupby;
    const uniqueAgents: string[] = df["Agent"].unique().values;

    uniqueAgents.forEach(agent => {
      const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
      const agentGroupJson = dfd.toJSON(agentGroup);
      if (Array.isArray(agentGroupJson)) {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(agentGroupJson);
        XLSX.utils.book_append_sheet(workbook, worksheet, agent);
        resizeColumns(worksheet, agentGroupJson, Object.keys(agentGroupJson[0]));
      }
    });
  };

  // Create earnings report sheet
  const createEarningsReportSheet = (workbook: XLSX.WorkBook, df: dfd.DataFrame): void => {
    const emptyRowsDf: dfd.DataFrame = createEmptyRows(df);
    const grouped: Groupby = df.groupby(["Agent"]) as Groupby;
    const uniqueAgents: string[] = df["Agent"].unique().values;

    uniqueAgents.forEach(agent => {
      const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
      df = dfd.concat({ dfList: [df, emptyRowsDf, agentGroup], axis: 0 }) as DataFrame;
    });

    const earningsReportJson = dfd.toJSON(df);
    if (Array.isArray(earningsReportJson)) {
      const earningsReportSheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(earningsReportJson);

      const rowCount = df.values.length;
      const indices = {
        commissionPercentage: getColumnIndex("Commission %", df),
        commissionOwed: getColumnIndex("Commission Owed", df),
      };
  
      for (let row = 1; row <= rowCount + 1; row++) {
        const commissionOwedCellAddress = XLSX.utils.encode_cell({ c: indices.commissionOwed, r: row });
        const commissionPercentageCellAddress = XLSX.utils.encode_cell({ c: indices.commissionPercentage, r: row });
        if (earningsReportSheet[commissionOwedCellAddress]) {
          earningsReportSheet[commissionOwedCellAddress].z = '$#,##0.00';
        }
        if (earningsReportSheet[commissionPercentageCellAddress]) {
          earningsReportSheet[commissionPercentageCellAddress].z = '0.0%'; 
        }
      }

      const formattedDate: string = dayjs().format("MMDDYYYY");
      XLSX.utils.book_append_sheet(workbook, earningsReportSheet, `EarningsReport_${formattedDate}`);
      resizeColumns(earningsReportSheet, earningsReportJson, Object.keys(earningsReportJson[0]));
      workbook.SheetNames = [workbook.SheetNames.pop() as string, ...workbook.SheetNames];
    }
  };

  // Create empty rows for separation
  const createEmptyRows = (df: dfd.DataFrame): dfd.DataFrame => {
    const emptyRow = Object.fromEntries(df.columns.map(column => [column, ""]));
    const headerRow = Object.fromEntries(df.columns.map(column => [column, column]));
    return new dfd.DataFrame([emptyRow, emptyRow, headerRow]);
  };

  // Resize columns based on content
  const resizeColumns = (worksheet: XLSX.WorkSheet, jsonData: any[], headers: string[]) => {
    const columnWidths: number[] = [];

    headers.forEach((header, index) => {
      const headerLength = header.length;
      columnWidths[index] = Math.max(columnWidths[index] || 0, headerLength);
    });

    jsonData.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const cellValue = row[key]?.toString() || "";
        const cellLength = cellValue.length;
        columnWidths[index] = Math.max(columnWidths[index] || 0, cellLength);
      });
    });

    worksheet["!cols"] = columnWidths.map(width => ({ wpx: (width + 2) * 7 }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: loadingMappings
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Drag and Drop File Upload</h1>

      <div
        {...getRootProps()}
        className={`w-full max-w-lg p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragActive ? "border-blue-400 bg-blue-50" : loadingMappings ? "border-gray-300 bg-gray-100 cursor-not-allowed" : "border-gray-300 bg-white"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-gray-600">
          {loadingMappings ? "Loading mappings, please wait..." : isDragActive ? "Drop the files here ..." : "Drag & drop some files here, or click to select files"}
        </p>
      </div>

      <div className="mt-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Uploaded Files</h2>
        <ul className="space-y-3">
          {files.map((file, index) => (
            <li key={index} className="flex justify-between items-center p-3 bg-gray-100 rounded-md border">
              <span className="text-gray-700">{file.name}</span>
              <span className="text-gray-500 text-sm">{Math.round(file.size / 1024)} KB</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home;