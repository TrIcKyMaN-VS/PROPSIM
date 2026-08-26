const fs = require('fs');
let lines = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8').split('\n');

const pasteIdx = lines.findIndex(l => l.includes('const handlePaste = (e: ClipboardEvent) => {'));
if (pasteIdx !== -1) {
  let endIdx = pasteIdx;
  while (!lines[endIdx].includes('window.addEventListener("paste", handlePaste)')) endIdx++;
  
  lines.splice(pasteIdx, endIdx - pasteIdx,
`      const handlePaste = async (e: ClipboardEvent) => {
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
              formData.append("prefix", "new_trade_paste")
              const url = await uploadImageFormData(formData)
              setScreenshots(s => [...s, url])
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

const uploadIdx = lines.findIndex(l => l.includes('const handleUploadScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {'));
if (uploadIdx !== -1) {
  let endIdx = uploadIdx;
  while (!lines[endIdx].includes('e.target.value = ""')) endIdx++;
  endIdx++; 
  
  lines.splice(uploadIdx, endIdx - uploadIdx + 1,
`  const [uploadingImg, setUploadingImg] = useState(false)
  
  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "new_trade_upload")
        const url = await uploadImageFormData(formData)
        setScreenshots(s => [...s, url])
      }
      toast.success("Screenshots uploaded!")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }`
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
  '<input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} />',
  '<input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadScreenshot} disabled={uploadingImg} />'
);
fs.writeFileSync('app/app/journal/new/page.tsx', content, 'utf8');