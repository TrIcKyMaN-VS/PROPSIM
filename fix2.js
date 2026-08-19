const fs = require('fs');
let content = fs.readFileSync('app/app/journal/new/page.tsx', 'utf8');

const debouncedTextarea = `function DebouncedTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || '')
  useEffect(() => { setVal(props.value || '') }, [props.value])
  return (
    <Textarea 
      {...props} 
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={e => {
        if (props.onChange) props.onChange(e as any)
        if (props.onBlur) props.onBlur(e)
      }}
    />
  )
}
`

if (!content.includes('function DebouncedTextarea')) {
  content = content.replace('export default function NewManualTradePage() {', debouncedTextarea + 'export default function NewManualTradePage() {');
  
  content = content.replace(/<Textarea([\s\S]*?)value=\{form\.reasoning\}([\s\S]*?)\/>/g, '<DebouncedTextarea$1value={form.reasoning}$2/>');
  content = content.replace(/<Textarea([\s\S]*?)value=\{form\.resultVsExpectation\}([\s\S]*?)\/>/g, '<DebouncedTextarea$1value={form.resultVsExpectation}$2/>');
  content = content.replace(/<Textarea([\s\S]*?)value=\{form\.mistakes\}([\s\S]*?)\/>/g, '<DebouncedTextarea$1value={form.mistakes}$2/>');

  fs.writeFileSync('app/app/journal/new/page.tsx', content, 'utf8');
}
