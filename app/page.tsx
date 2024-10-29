
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as dfd from "danfojs";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import Groupby from "danfojs/dist/danfojs-base/aggregators/groupby";
import { DataFrame } from "danfojs/dist/danfojs-base";
import * as excelConstants from './constants/excelConstants';
import processDataFrame from './modules/DataFrameProcessor';

interface FileData {
  name: string;
  size: number;
}

interface Mappings {
  productNameMapping: { [key: string]: string };
  productAgentCommissionMapping: { [key: string]: { [key: string]: number } };
  excludedAgents: string[];
  productTypes: { [key: string]: string };
  annuityCommissionPercentage: number;
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

    const dataFrame: dfd.DataFrame = await dfd.readExcel(acceptedFiles[0]) as dfd.DataFrame;

    const modifiedDataFrame = processDataFrame(dataFrame, mappings);

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    createGroupedSheets(workbook, modifiedDataFrame);
    createEarningsReportSheet(workbook, modifiedDataFrame);
    
    XLSX.writeFile(workbook, "grouped_data.xlsx");
  }, [loadingMappings, mappings]);

  // Map accepted files to FileData structure
  const mapFiles = (acceptedFiles: File[]): FileData[] => 
    acceptedFiles.map(file => ({ name: file.name, size: file.size }));

  // Get column index by column name
  const getColumnIndex = (columnName: string, df: dfd.DataFrame): number => {
    return df.columns.findIndex(currentColumnName => currentColumnName === columnName);
  };

  // Create grouped sheets in the workbook
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

  // Create earnings report sheet
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

  // Create empty rows for separation
  const createEmptyRows = (df: dfd.DataFrame): dfd.DataFrame => {
    const emptyRow = Object.fromEntries(df.columns.map(column => [column, ""]));
    const headerRow = Object.fromEntries(df.columns.map(column => [column, column]));
    return new dfd.DataFrame([emptyRow, emptyRow, emptyRow, headerRow]);
  };

  const resizeColumns = (worksheet: XLSX.WorkSheet, jsonData: any[], headers: string[]) => {
    // Initialize the maximum width
    let maxColumnWidth = 0;

    // Determine the maximum width from the headers
    headers.forEach(header => {
        maxColumnWidth = Math.max(maxColumnWidth, header.length);
    });

    // Determine the maximum width from each cell's content in jsonData
    jsonData.forEach(row => {
        Object.values(row).forEach(cellValue => {
            const cellLength = cellValue?.toString().length || 0;
            maxColumnWidth = Math.max(maxColumnWidth, cellLength);
        });
    });

    // Apply the maximum width to all columns in the worksheet
    worksheet["!cols"] = headers.map(() => ({ wpx: (maxColumnWidth + 2) * 7 }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: excelConstants.acceptedFileFormats,
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