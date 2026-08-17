const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const buf = fs.readFileSync('Trading-Journal-System-hayeder-trades.pdf');
const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
const parser = new PDFParse(uint8);

async function run() {
  await parser.load();
  const result = await parser.getText();
  // result is { text: string, total: number }
  const fullText = typeof result === 'string' ? result : result.text || result;
  fs.writeFileSync('scratch/pdf-full-text.txt', String(fullText), 'utf8');
  console.log('Written to scratch/pdf-full-text.txt, length:', String(fullText).length);
}

run().catch(e => console.error(e));
