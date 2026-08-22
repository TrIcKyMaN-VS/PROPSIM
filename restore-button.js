const { execSync } = require('child_process');
try {
  execSync('git checkout components/ui/button.tsx');
  console.log('Restored button.tsx');
} catch (e) {
  console.error(e.message);
}
