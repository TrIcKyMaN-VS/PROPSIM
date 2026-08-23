import dynamic from "next/dynamic"

function TestInner() { return <div>Test</div> }
export const Test = dynamic(() => Promise.resolve(TestInner), { ssr: false })
