
"use client";

import React, { useCallback } from "react";
import FileUploader from "./components/FileUploader";

const Home: React.FC = () => {
  const getFile = async (file: File): Promise<Blob | undefined> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      return await response.blob();
      
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  const downloadFile = (blob: Blob) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'data.xlsx'); 
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const onFilesUploaded = useCallback(async (file: File) => {
    const blob = await getFile(file);

    if (blob !== undefined) {
      downloadFile(blob);
    } else {
      // Put some handling here
    }
  }, []);

  return (
    <div>
      <FileUploader loading={false} onFilesUpdate={onFilesUploaded} />
    </div>
  );
};

export default Home;