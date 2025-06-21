import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const countWordsInPDF = async (file) => {
  const typedarray = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

  let totalText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    totalText += content.items.map(item => item.str).join(' ');
  }

  return totalText.trim().split(/\s+/).length;
};

export const countPagesInPDF = async (file) => {
  const typedarray = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
  return pdf.numPages;
};
