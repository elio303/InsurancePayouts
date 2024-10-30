'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { acceptedFileFormats } from '@/app/constants/excelConstants';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (loading) {
      setError("Please wait while the current operation is in progress!");
      return;
    }

    const mappedFiles = mapFiles(acceptedFiles);
    setFiles(prevFiles => [...prevFiles, ...mappedFiles]);
    setUploadedFile(acceptedFiles[0]);
    setSuccess(null);
  }, [loading]);

  const mapFiles = (acceptedFiles: File[]): FileData[] =>
    acceptedFiles.map(file => ({ name: file.name, size: file.size }));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileFormats,
    multiple: false,
    disabled: loading
  });

  useEffect(() => {
    if (uploadedFile) {
      onFilesUpdate(uploadedFile)
        .then(() => setSuccess("File uploaded successfully!"))
        .catch(() => setError("Failed to upload the file. Please try again."));
    }
  }, [uploadedFile, onFilesUpdate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-10">
      <h1 className="text-4xl font-semibold text-gray-900 mb-6">Insurance Commission File Upload</h1>
      <p className="text-sm text-gray-600 mb-4">Ensure your file is in .xls or .xlsx format to calculate commissions accurately.</p>

      <div
        {...getRootProps()}
        className={`w-full max-w-lg p-8 border-2 border-dashed rounded-lg shadow-lg cursor-pointer transition-all duration-300 ease-in-out ${
          isDragActive
            ? "border-blue-600 bg-blue-50"
            : loading
            ? "border-gray-300 bg-gray-200 cursor-not-allowed"
            : "border-gray-300 bg-white hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-center text-lg text-gray-700">
          {loading
            ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 100 8v4a8 8 0 01-8-8z" />
                </svg>
                Processing your request...
              </span>
            )
            : isDragActive
            ? "Drop your file here ..."
            : "Drag & drop your Excel files here, or click to select files"}
        </p>
      </div>

      <div className="mt-6 w-full max-w-lg">
        {error && <p className="text-red-600 text-center">{error}</p>}
        {success && <p className="text-green-600 text-center">{success}</p>}
      </div>

      <div className="mt-8 w-full max-w-lg bg-white rounded-lg shadow border border-gray-300">
        <h2 className="text-2xl font-semibold text-gray-800 p-4 border-b">Uploaded Files</h2>
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li key={index} className="flex justify-between items-center p-4 border-b last:border-b-0">
              <span className="text-gray-700 font-medium">{file.name}</span>
              <span className="text-gray-500 text-sm">{Math.round(file.size / 1024)} KB</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;