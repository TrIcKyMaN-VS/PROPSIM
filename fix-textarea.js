const fs = require('fs');
let content = fs.readFileSync('app/app/weekly-review/page.tsx', 'utf8');

const autoTextareaComponent = `
function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || '')
  
  useEffect(() => {
    setVal(props.value || '')
  }, [props.value])

  return (
    <Textarea 
      {...props} 
      value={val}
      onChange={(e) => {
        setVal(e.target.value)
      }}
      onBlur={(e) => {
        if (props.onChange) {
          props.onChange(e as any)
        }
        if (props.onBlur) props.onBlur(e)
      }}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto'
        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
        if (props.onInput) props.onInput(e)
      }}
      className={props.className + " resize-none overflow-hidden"}
    />
  )
}
`

if (!content.includes('function AutoTextarea')) {
  content = content.replace('export default function WeeklyReviewPage() {', autoTextareaComponent + '\nexport default function WeeklyReviewPage() {');
}

// Replace all <Textarea with <AutoTextarea
content = content.replace(/<Textarea/g, '<AutoTextarea');

fs.writeFileSync('app/app/weekly-review/page.tsx', content, 'utf8');
