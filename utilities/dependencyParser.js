const fs = require('fs');
const path = require('path');

const folderPath = './js'; // Specify the folder path to scan

function scanFolder(folderPath) {
  const dependencies = {};

  function processFile(filePath) {
    console.log(`Processing file: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s*{([^}]*)}\s*from\s*['"](.*?)['"]/g;
    const exportRegex = /export\s*(?:async\s+)?(?:function|class|const|let|var)?\s*(\w+)/g;
    const exportClassRegex = /export\s*class\s*(\w+)/g;
    const exportConstRegex = /export\s*const\s*(\w+)/g;
    const exportLetRegex = /export\s*let\s*(\w+)/g;
    const exportVarRegex = /export\s*var\s*(\w+)/g;
    const exportArrayRegex = /export\s*const\s*(\w+)\s*=\s*(\[[^\]]*\])/g;

    let match;
    while ((match = importRegex.exec(fileContent))) {
      const importedDependencies = match[1]
        .split(',')
        .map((dep) => dep.trim())
        .filter(Boolean);
      const dependencyModule = match[2];

      console.log(` - Found dependency: ${dependencyModule}`);
      console.log(`   - Imports: ${importedDependencies.join(', ')}`);

      if (!dependencies[dependencyModule]) {
        dependencies[dependencyModule] = {
          exports: [],
        };
      }

      dependencies[dependencyModule].exports.push(
        ...importedDependencies.map((dep) => ({
          name: dep,
          type: 'unknown',
        }))
      );
    }

    let exportMatch;
    while ((exportMatch = exportRegex.exec(fileContent))) {
      const exportName = exportMatch[1];
      let exportType = 'unknown';

      if (exportMatch[0].startsWith('export function')) {
        exportType = 'function';
      } else if (exportClassRegex.test(exportMatch[0])) {
        exportType = 'class';
      } else if (exportConstRegex.test(exportMatch[0])) {
        exportType = 'constant';
      } else if (exportLetRegex.test(exportMatch[0])) {
        exportType = 'let';
      } else if (exportVarRegex.test(exportMatch[0])) {
        exportType = 'var';
      } else if (exportArrayRegex.test(exportMatch[0])) {
        exportType = 'array';
      }

      console.log(` - Exported ${exportType}: ${exportName}`);

      if (!dependencies[filePath]) {
        dependencies[filePath] = {
          exports: [],
        };
      }

      dependencies[filePath].exports.push({
        name: exportName,
        type: exportType,
      });
    }

    console.log();
  }

  function processFolder(folderPath) {
    const files = fs.readdirSync(folderPath);

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && path.extname(file) === '.js') {
        processFile(filePath);
      } else if (stats.isDirectory()) {
        processFolder(filePath);
      }
    });
  }

  processFolder(folderPath);

  return dependencies;
}

const result = scanFolder(folderPath);
const jsonResult = JSON.stringify(result, null, 2);
console.log(jsonResult);
