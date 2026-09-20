const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'warnOfExpoGoPushUsage.js'),
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'warnOfExpoGoPushUsage.ts'),
];

targetFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("throw new Error(message)")) {
      content = content.replace(/if\s*\(Platform\.OS\s*===\s*'android'\)\s*\{\s*throw new Error\(message\);\s*\}\s*else if\s*\(__DEV__\)\s*\{\s*didWarn\s*=\s*true;\s*console\.warn\(message\);\s*\}/g, 'didWarn = true; console.warn(message);');
      content = content.replace(/if\s*\(Platform\.OS\s*===\s*'android'\)\s*\{\s*throw new Error\(message\);\s*\}/g, 'didWarn = true; console.warn(message);');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-expo-notifications] Successfully patched ${filePath}`);
    }
  }
});
