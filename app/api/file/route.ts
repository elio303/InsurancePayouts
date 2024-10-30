import { NextResponse } from 'next/server';
import DataFrameProcessor from '@/app/processors/DataFrameProcessor';
import FileToDataFrameConverter from '@/app/converters/FileToDataFrameConverter';
import DataFrameToJsonsConverter from '@/app/converters/DataFrameToJsonsConverter';
import JsonsToExcelConverter from '@/app/converters/JsonsToExcelBufferConverter';

export async function POST(request: Request) {
  const formData = await request.formData();
  const inputFile = formData.get('file') as File | null;

  if (!inputFile || !(inputFile instanceof Blob)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  try {
    const rawDataFrame = await FileToDataFrameConverter.convert(inputFile);
    const processedDataFrame = DataFrameProcessor.process(rawDataFrame);
    const namedJsons = DataFrameToJsonsConverter.convert(processedDataFrame);
    const outputBuffer = await JsonsToExcelConverter.convert(namedJsons);

    const originalFileName = inputFile.name.replace(/\.[^/.]+$/, "");
    const downloadFileName = `${originalFileName}_sausage.xlsx`;

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: unknown) {
    console.error('Error processing file:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: 'Error processing file: ' + errorMessage }, { status: 500 });
  }
}