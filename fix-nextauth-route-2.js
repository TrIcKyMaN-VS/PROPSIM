const fs = require('fs');
let content = fs.readFileSync('app/api/auth/[...nextauth]/route.ts', 'utf8');

const parts = content.split('const handler = NextAuth(authOptions)');
if (parts.length === 2) {
  content = parts[0] + 'const handler = NextAuth(authOptions)\n\nexport { handler as GET, handler as POST }\n';
  fs.writeFileSync('app/api/auth/[...nextauth]/route.ts', content, 'utf8');
}