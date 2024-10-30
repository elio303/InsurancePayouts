"use client";

import React, { useCallback, useState } from "react";
import FileUploader from "@/app/components/FileUploader";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from '@vercel/speed-insights/next';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFile = async (file: File): Promise<Blob | undefined> => {
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError(null);

    try { 
      const response = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      return await response.blob();
    } catch (error) {
      console.error("Failed to download file:", error);
      setError("Failed to upload the file. Please try again.");
      setTimeout(() => setError(null), 3000); 
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (blob: Blob) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "data.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const onFilesUploaded = useCallback(async (file: File) => {
    const blob = await getFile(file);

    if (blob) {
      downloadFile(blob);
    }
  }, []);

  return (
    <div>
      <FileUploader loading={loading} error={error} onFilesUpdate={onFilesUploaded} />
      <Analytics />
      <SpeedInsights />
    </div>
  );
};

export default Home;