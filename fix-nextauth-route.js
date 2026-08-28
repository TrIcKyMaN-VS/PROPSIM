const fs = require('fs');
let content = fs.readFileSync('app/api/auth/[...nextauth]/route.ts', 'utf8');

const regex = /export async function GET[\s\S]+?throw error;\n\s*\}/m;
content = content.replace(regex, 'export { handler as GET, handler as POST }');

const postRegex = /export async function POST[\s\S]+?throw error;\n\s*\}/m;
content = content.replace(postRegex, '');

fs.writeFileSync('app/api/auth/[...nextauth]/route.ts', content, 'utf8');