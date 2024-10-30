import * as xlsx from 'xlsx';
import * as dfd from 'danfojs';

const convert = async (file: File): Promise<dfd.DataFrame> => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0]; 
    const worksheet = workbook.Sheets[firstSheetName]; 
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    return new dfd.DataFrame(jsonData);
}

export default {
    convert,
};

