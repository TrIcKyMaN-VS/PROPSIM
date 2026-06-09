import XLSX from 'xlsx'

try {
  const workbook = XLSX.readFile('c:/Users/vasan/Downloads/Trading_Operating_System.xlsx')
  console.log("Sheet Names:", workbook.SheetNames)
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`)
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet)
    console.log(JSON.stringify(data, null, 2))
  }
} catch (err) {
  console.error("Error reading file:", err)
}
