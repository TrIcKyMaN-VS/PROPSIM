const fs = require('fs');
let content = fs.readFileSync('app/app/journal/[tradeId]/page.tsx', 'utf8');

// Ensure uploadImageFormData is imported
if (!content.includes('uploadImageFormData')) {
  content = content.replace(
    'import { getPropFirms } from "@/lib/firms"',
    'import { getPropFirms } from "@/lib/firms"\nimport { uploadImageFormData } from "@/app/actions/journal-actions"'
  );
}

// Update handleFileUpload
const uploadOld = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !trade) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      await addScreenshot(trade.id, \`gallery-\${Date.now()}\`, reader.result as string)
      toast.success("Screenshot uploaded!")
    }
    reader.readAsDataURL(file)
          e.preventDefault()
    e.target.value = ""
  }`;

const uploadNew = `  const [uploadingImg, setUploadingImg] = useState(false)
  
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
  }`;

content = content.replace(uploadOld, uploadNew);

// Update handlePaste
const pasteOldRegex = /const handlePaste = async \(e: ClipboardEvent\) => \{[\s\S]*?toast\.success\("Screenshot pasted!"\)\n\s*\}\n\s*reader\.readAsDataURL\(file\)\n\s*\}\n\s*\}/;

const pasteNew = `const handlePaste = async (e: ClipboardEvent) => {
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
      }`;

content = content.replace(pasteOldRegex, pasteNew);

// Fix button disable state
content = content.replace(
  '<input id="sc-upload-more" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />',
  '<input id="sc-upload-more" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingImg} />'
);
content = content.replace(
  '<input id="sc-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />',
  '<input id="sc-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingImg} />'
);

fs.writeFileSync('app/app/journal/[tradeId]/page.tsx', content, 'utf8');