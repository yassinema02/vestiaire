const fs = require('fs');
const path = require('path');

const srcDirs = ['app', 'components'];
const targetComponent = 'components/ui/Typography';

function getRelativePath(fromPath, toPath) {
  let relative = path.relative(path.dirname(fromPath), toPath);
  if (!relative.startsWith('.')) relative = './' + relative;
  // Remove extension for import
  return relative.replace(/\.tsx?$/, '');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Match import { ... } from 'react-native'
  // Could be multiline, so we use a robust regex
  const rnImportRegex = /import\s+{([^}]*)}\s+from\s+['"]react-native['"];?/g;
  let hasTextImport = false;
  
  content = content.replace(rnImportRegex, (match, importsStr) => {
    // If Text is imported
    if (/\bText\b/.test(importsStr)) {
      hasTextImport = true;
      let newImportsStr = importsStr.replace(/\bText\b/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ');
      
      if (newImportsStr.length === 0) {
        return ''; // Remove the entire import line if it was only Text
      } else {
        return `import { ${newImportsStr} } from 'react-native';`;
      }
    }
    return match; // No Text import, leave unchanged
  });

  if (hasTextImport && !content.includes('Typography')) {
    const relPath = getRelativePath(filePath, targetComponent);
    const importStatement = `import { Text } from '${relPath}';\n`;
    
    // Find a good place to insert the import: after the first react import or at the top
    const lastReactImport = content.lastIndexOf('import ');
    if (lastReactImport !== -1) {
      const endOfLine = content.indexOf('\n', lastReactImport);
      content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    } else {
      content = importStatement + content;
    }
    
    // Quick optional fix: Replace <Text style={{ fontFamily: appTheme.typography.display }}> 
    // This is hard to regex safely, so we leave existing styles as-is since we added the 'display' fallback token.
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (!fullPath.includes('Typography.tsx') && !fullPath.includes('Typography.ts')) {
        processFile(fullPath);
      }
    }
  }
}

srcDirs.forEach(walkDir);
console.log('Done refactoring Text imports.');
