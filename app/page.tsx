"use client";

import React, { useCallback, useState, useEffect } from "react";
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
  newColumns: string[];
}

export default function Home() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [mappings, setMappings] = useState<Mappings | null>(null);
  const [loadingMappings, setLoadingMappings] = useState<boolean>(true);

  useEffect(() => {
    async function fetchMappings() {
      try {
        const response = await fetch('/api/getMappings');
        const data = await response.json();
        setMappings(data);
      } catch (error) {
        console.error("Failed to load mappings:", error);
      } finally {
        setLoadingMappings(false); 
      }
    }

    fetchMappings();
  }, []);

  // Drop event handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (loadingMappings) {  // Check if mappings are still loading
      alert("Please wait until mappings have been loaded!");
      return;
    }

    if (mappings == null) {
      alert("Mappings failed to load. Please try again.");
      return;
    }

    const mappedFiles = mapFiles(acceptedFiles);
    setFiles(prevFiles => [...prevFiles, ...mappedFiles]);

    let df: dfd.DataFrame = await loadAndCleanData(acceptedFiles[0], mappings as Mappings);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    // Create sheets
    createGroupedSheets(workbook, df);
    createEarningsReportSheet(workbook, df);

    // Write the workbook to file
    XLSX.writeFile(workbook, "grouped_data.xlsx");
  }, [loadingMappings, mappings]);

  // Map files for display
  const mapFiles = (acceptedFiles: File[]): FileData[] =>
    acceptedFiles.map(file => ({
      name: file.name,
      size: file.size,
    }));

  // Load and clean data from file
  const loadAndCleanData = async (file: File, mappings: Mappings): Promise<dfd.DataFrame> => {
    let df: dfd.DataFrame = await dfd.readExcel(file) as dfd.DataFrame;
    df = new dfd.DataFrame(df.values.slice(3, -2), { columns: df.values[2] as any });
    df = df.drop({ columns: mappings?.columnsToDrop });
    df.rename(mappings?.renameMapping as any, { inplace: true });
    df = df.loc({ columns: mappings?.columnsToKeep });
    df = mapProductNames(df, mappings.productNameMapping);
    df = addEmptyColumns(df, mappings.newColumns); 
    return df;
  };

  const mapProductNames = (df: dfd.DataFrame, productNameMapping: { [key: string]: string }): dfd.DataFrame => {
    df["Product Name"] = df["Product Name"].map((value: string) => productNameMapping[value] || value);
    return df;
  };

  // Add empty columns to DataFrame
  const addEmptyColumns = (df: dfd.DataFrame, newColumns: string[]): dfd.DataFrame => {
    newColumns.forEach(column => {
      const emptyArray: string[] = new Array(df.shape[0]).fill(""); // Create an array of empty strings
      df = df.addColumn(column, emptyArray); // Update df with new column
    });

    return df; // Return the modified DataFrame
  };

  // Create individual sheets grouped by Agent
  const createGroupedSheets = (workbook: XLSX.WorkBook, df: dfd.DataFrame): void => {
    const grouped: Groupby = df.groupby(["Agent"]) as Groupby;
    const uniqueAgents: string[] = df["Agent"].unique().values;

    uniqueAgents.forEach(agent => {
      const agentGroup: dfd.DataFrame = grouped.getGroup([agent]).loc({ columns: df.columns });
      const agentGroupJson = dfd.toJSON(agentGroup);
      if (Array.isArray(agentGroupJson)) {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(agentGroupJson);
        XLSX.utils.book_append_sheet(workbook, worksheet, agent.toString());

        // Resize columns to fit content
        resizeColumns(worksheet, agentGroupJson, Object.keys(agentGroupJson[0]));
      }
    });
  };

  // Create Earnings Report Sheet
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
      const formattedDate: string = dayjs().format("MMDDYYYY");
      XLSX.utils.book_append_sheet(workbook, earningsReportSheet, `EarningsReport_${formattedDate}`);

      // Resize columns to fit content for the earnings report sheet
      resizeColumns(earningsReportSheet, earningsReportJson, Object.keys(earningsReportJson[0]));

      // Move Earnings Report to the front
      workbook.SheetNames = [workbook.SheetNames.pop() as string, ...workbook.SheetNames];
    }
  };

  const createEmptyRows = (df: dfd.DataFrame): dfd.DataFrame => {
    const emptyRow: { [key: string]: string } = Object.fromEntries(df.columns.map(column => [column, ""]));
    const headerRow: { [key: string]: string } = Object.fromEntries(df.columns.map(column => [column, column]));
    return new dfd.DataFrame([emptyRow, emptyRow, headerRow]);
  };

  // Function to resize columns based on the content
  const resizeColumns = (worksheet: XLSX.WorkSheet, jsonData: any[], headers: string[]) => {
    const columnWidths: number[] = [];

    // Check header lengths first
    headers.forEach((header, index) => {
      const headerLength = header.length;
      if (!columnWidths[index] || headerLength > columnWidths[index]) {
        columnWidths[index] = headerLength;
      }
    });

    // Then check each row
    jsonData.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const cellValue = row[key]?.toString() || "";
        const cellLength = cellValue.length;

        if (!columnWidths[index] || cellLength > columnWidths[index]) {
          columnWidths[index] = cellLength;
        }
      });
    });

    // Set the column widths
    columnWidths.forEach((width, index) => {
      worksheet["!cols"] = worksheet["!cols"] || [];
      worksheet["!cols"][index] = { wpx: (width + 2) * 7 }; // Adjust multiplier for better fitting
    });
  };

  // Dropzone for drag-and-drop functionality
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled: loadingMappings // Disable dropzone while loading mappings
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Drag and Drop File Upload</h1>

      {/* Drag and Drop Zone */}
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

      {/* File List */}
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
}