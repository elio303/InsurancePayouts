
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { acceptedFileFormats } from "../constants/excelConstants";

interface FileData {
  name: string;
  size: number;
}

interface FileUploaderProps {
  loading: boolean;
  onFilesUpdate: (files: File) => Promise<void>;
}

const FileUploader: React.FC<FileUploaderProps> = ({ loading, onFilesUpdate }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File>();

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (loading) {
      alert("Please wait while we load the file drop component!");
      return;
    }

    const mappedFiles = mapFiles(acceptedFiles);
    setFiles(prevFiles => [...prevFiles, ...mappedFiles]);
    setUploadedFile(acceptedFiles[0]);
  }, [loading]);

  // Map accepted files to FileData structure
  const mapFiles = (acceptedFiles: File[]): FileData[] => 
    acceptedFiles.map(file => ({ name: file.name, size: file.size }));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileFormats,
    multiple: false,
    disabled: loading
  });

  useEffect(() => {
    uploadedFile && onFilesUpdate(uploadedFile);
  }, [uploadedFile, onFilesUpdate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Drag and Drop File Upload</h1>

      <div
        {...getRootProps()}
        className={`w-full max-w-lg p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : loading
            ? "border-gray-300 bg-gray-100 cursor-not-allowed"
            : "border-gray-300 bg-white"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-gray-600">
          {loading
            ? "Loading mappings, please wait..."
            : isDragActive
            ? "Drop the files here ..."
            : "Drag & drop some files here, or click to select files"}
        </p>
      </div>

      <div className="mt-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Uploaded Files</h2>
        <ul className="space-y-3">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex justify-between items-center p-3 bg-gray-100 rounded-md border"
            >
              <span className="text-gray-700">{file.name}</span>
              <span className="text-gray-500 text-sm">
                {Math.round(file.size / 1024)} KB
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;