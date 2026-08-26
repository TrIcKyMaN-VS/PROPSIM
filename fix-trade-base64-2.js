const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8').split('\n');

const uploadIdx = lines.findIndex(l => l.includes('const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {'));
if (uploadIdx !== -1) {
  let endIdx = uploadIdx;
  while (!lines[endIdx].includes('e.target.value = ""')) endIdx++;
  endIdx++; // skip the closing brace if needed, wait, e.target.value = "" is inside the block. The } is the next line.
  
  lines.splice(uploadIdx, endIdx - uploadIdx + 2,
`  const [uploadingImg, setUploadingImg] = useState(false)
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !trade) return
    
    setUploadingImg(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "trade_" + trade.id)
        const url = await uploadImageFormData(formData)
        await addScreenshot(trade.id, "gallery-" + Date.now() + "-" + i, url)
      }
      toast.success("Screenshots uploaded!")
    } catch {
      toast.error("Screenshot upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }`
  );
}

const pasteIdx = lines.findIndex(l => l.includes('const handlePaste = async (e: ClipboardEvent) => {'));
if (pasteIdx !== -1) {
  let endIdx = pasteIdx;
  while (!lines[endIdx].includes('window.addEventListener("paste", handlePaste)')) endIdx++;
  
  lines.splice(pasteIdx, endIdx - pasteIdx,
`      const handlePaste = async (e: ClipboardEvent) => {
        if (!trade) return
        const items = e.clipboardData?.items
        if (!items) return
        let hasImage = false
        for (const item of Array.from(items)) {
          if (item.type.indexOf("image") !== -1) hasImage = true
        }
        if (hasImage) e.preventDefault()
        
        for (const item of Array.from(items)) {
          if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile()
            if (!file) continue
            setUploadingImg(true)
            try {
              const formData = new FormData()
              formData.append("file", file)
              formData.append("prefix", "trade_" + trade.id)
              const url = await uploadImageFormData(formData)
              await addScreenshot(trade.id, "gallery-" + Date.now() + "-paste", url)
              toast.success("Screenshot pasted!")
            } catch {
              toast.error("Paste upload failed")
            } finally {
              setUploadingImg(false)
            }
          }
        }
      }
      `
  );
}

let content = lines.join('\n');
if (!content.includes('uploadImageFormData')) {
  content = content.replace(
    'import { getPropFirms } from "@/lib/firms"',
    'import { getPropFirms } from "@/lib/firms"\nimport { uploadImageFormData } from "@/app/actions/journal-actions"'
  );
}
content = content.replace(
  '<input id="sc-upload-more" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />',
  '<input id="sc-upload-more" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingImg} />'
);
content = content.replace(
  '<input id="sc-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />',
  '<input id="sc-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingImg} />'
);
fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');