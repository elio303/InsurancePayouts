
"use client";

import React, { useCallback, useEffect, useState } from "react";
import * as dfd from "danfojs";
import processDataFrame from './modules/DataFrameProcessor';
import FileUploader from "./components/FileUploader";
import createExcelFile from "./modules/ExcelProccessor";

interface Mappings {
  productNameMapping: { [key: string]: string };
  productAgentCommissionMapping: { [key: string]: { [key: string]: number } };
  excludedAgents: string[];
  productTypes: { [key: string]: string };
  annuityCommissionPercentage: number;
}

const Home: React.FC = () => {
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
  const onFilesUploaded = useCallback(async (file: File) => {
    if (loadingMappings) {
      alert("Please wait until mappings have been loaded!");
      return;
    }

    if (!mappings) {
      alert("Mappings failed to load. Please try again.");
      return;
    }

    const dataFrame: dfd.DataFrame = await dfd.readExcel(file) as dfd.DataFrame;
    const modifiedDataFrame = processDataFrame(dataFrame, mappings);

    createExcelFile(modifiedDataFrame);
  }, [loadingMappings, mappings]);

  return (
    <div>
      <FileUploader loading={loadingMappings} onFilesUpdate={onFilesUploaded} />
    </div>
  );
};

export default Home;