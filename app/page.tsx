"use client";

import React, { useCallback, useState } from "react";
import FileUploader from "@/app/components/FileUploader";

const Home: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const getFile = async (file: File): Promise<Blob | undefined> => {
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);

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
    } finally {
      setLoading(false);
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
      // Handle error case
    }
  }, []);

  return (
    <div>
      <FileUploader loading={loading} onFilesUpdate={onFilesUploaded} />
      {loading && <div>Loading...</div>}
    </div>
  );
};

export default Home;