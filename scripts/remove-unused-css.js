#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const searchDir = process.argv[2] || path.join(process.cwd(), 'src');
const cssDir = process.argv[3] || path.join(process.cwd(), 'src');

console.log('\nCSS Cleanup Tool - Automatic Mode\n');
console.log('Searching for CSS files in:', cssDir);
console.log('Searching for usage in:', searchDir, '\n');

function findCssFiles(dir) {
    const cssFiles = [];
    
    function scan(directory) {
        try {
            const items = fs.readdirSync(directory);
            for (const item of items) {
                if (item === 'node_modules' || item === '.git' || item === 'build') continue;
                
                const fullPath = path.join(directory, item);
                
                try {
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        scan(fullPath);
                    } else if (item.endsWith('.css')) {
                        cssFiles.push(fullPath);
                    }
                } catch (statError) {
                }
            }
        } catch (error) {
        }
    }
    
    scan(dir);
    return cssFiles;
}

function extractClassNames(cssContent) {
    const classNames = new Set();
    const lines = cssContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('.')) {
            const match = line.match(/^\.([\w-]+)(?:\s|:|,|\{)/);
            if (match && !line.includes('@media') && !line.includes(' th:') && !line.includes(' td:')) {
                const potentialClass = match[1];
                
                const beforeClass = line.substring(0, line.indexOf('.' + potentialClass));
                if (!beforeClass.trim() || beforeClass.trim().endsWith(',')) {
                    classNames.add(potentialClass);
                }
            }
        }
    }
    
    return Array.from(classNames);
}

function isClassUsed(className, searchDir, cssFilePath) {
    try {
        const grepCommand = `grep -r "\\b${className}\\b" "${searchDir}" --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build -l 2>/dev/null || true`;
        const result = execSync(grepCommand, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
        
        const files = result.trim().split('\n').filter(f => {
            if (!f) return false;
            if (f.includes(cssFilePath)) return false;
            if (f.endsWith('.css')) return false;
            return true;
        });
        
        return files.length > 0;
    } catch (error) {
        return true;
    }
}

function isPartOfCommaSeparatedSelector(lines, startIndex) {
    for (let i = startIndex - 1; i >= Math.max(0, startIndex - 10); i--) {
        const line = lines[i].trim();
        if (line.includes('{')) {
            return false;
        }
        if (line.endsWith(',')) {
            return true;
        }
        if (line === '') {
            continue;
        }
        if (!line.endsWith(',') && line !== '') {
            return false;
        }
    }
    
    for (let i = startIndex + 1; i < Math.min(lines.length, startIndex + 10); i++) {
        const line = lines[i].trim();
        if (line.includes('{')) {
            return false;
        }
        if (line.startsWith('.') && line.includes(',')) {
            return true;
        }
        if (line === '') {
            continue;
        }
        break;
    }
    
    return false;
}

function removeUnusedClasses(cssContent, unusedClasses) {
    const lines = cssContent.split('\n');
    const result = [];
    const removed = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        
        let matchedClass = null;
        for (const className of unusedClasses) {
            if (trimmed.startsWith(`.${className}`) && 
                (trimmed.includes('{') || trimmed === `.${className}` || trimmed.endsWith(',') || trimmed.endsWith('{'))) {
                matchedClass = className;
                break;
            }
        }
        
        if (matchedClass) {
            if (isPartOfCommaSeparatedSelector(lines, i)) {
                result.push(line);
                i++;
            } else {
                let ruleStart = i;
                let braceCount = 0;
                let foundOpenBrace = false;
                
                while (i < lines.length) {
                    const currentLine = lines[i];
                    
                    if (currentLine.includes('{')) {
                        foundOpenBrace = true;
                        braceCount += (currentLine.match(/{/g) || []).length;
                        braceCount -= (currentLine.match(/}/g) || []).length;
                        i++;
                        break;
                    }
                    i++;
                }
                
                if (foundOpenBrace) {
                    while (i < lines.length && braceCount > 0) {
                        const currentLine = lines[i];
                        braceCount += (currentLine.match(/{/g) || []).length;
                        braceCount -= (currentLine.match(/}/g) || []).length;
                        i++;
                    }
                    removed.push(matchedClass);
                } else {
                    for (let j = ruleStart; j < i; j++) {
                        result.push(lines[j]);
                    }
                }
            }
        } else {
            result.push(line);
            i++;
        }
    }
    
    let newContent = result.join('\n');
    newContent = newContent.replace(/\n\n\n+/g, '\n\n');
    
    return { newContent, removedCount: removed.length, removedClasses: removed };
}

function processCssFile(cssFilePath, searchDir) {
    const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
    const classNames = extractClassNames(cssContent);
    
    const usedClasses = new Set();
    const unusedClasses = [];
    
    for (const className of classNames) {
        if (isClassUsed(className, searchDir, cssFilePath)) {
            usedClasses.add(className);
        } else {
            unusedClasses.push(className);
        }
    }
    
    if (unusedClasses.length === 0) {
        return { processed: true, removed: 0, linesRemoved: 0, fileName: cssFilePath, removedClasses: [] };
    }
    
    const { newContent, removedCount, removedClasses } = removeUnusedClasses(cssContent, unusedClasses);
    
    fs.writeFileSync(cssFilePath, newContent, 'utf-8');
    
    const originalLines = cssContent.split('\n').length;
    const newLines = newContent.split('\n').length;
    const linesRemoved = originalLines - newLines;
    
    return { processed: true, removed: removedCount, linesRemoved, fileName: cssFilePath, removedClasses };
}

const cssFiles = findCssFiles(cssDir);

if (cssFiles.length === 0) {
    console.log('No CSS files found in', cssDir, '\n');
    process.exit(1);
}

console.log('Found', cssFiles.length, 'CSS file(s)\n');

const results = {
    totalFiles: cssFiles.length,
    processedFiles: 0,
    totalRemoved: 0,
    totalLinesRemoved: 0,
    fileResults: []
};

for (const cssFile of cssFiles) {
    try {
        const result = processCssFile(cssFile, searchDir);
        results.processedFiles++;
        results.totalRemoved += result.removed;
        results.totalLinesRemoved += result.linesRemoved;
        if (result.removed > 0) {
            results.fileResults.push(result);
        }
    } catch (error) {
        console.error('Error processing', cssFile, ':', error.message);
    }
}

console.log('='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log('Files processed:', results.processedFiles + '/' + results.totalFiles);
console.log('Total classes removed:', results.totalRemoved);
console.log('Total lines removed:', results.totalLinesRemoved);
console.log('='.repeat(60) + '\n');

if (results.fileResults.length > 0) {
    console.log('Files with removed classes:\n');
    results.fileResults.forEach(file => {
        console.log('  ' + file.fileName);
        console.log('    Removed:', file.removed, 'classes,', file.linesRemoved, 'lines');
        if (file.removedClasses.length <= 10) {
            file.removedClasses.forEach(cls => console.log('      - .' + cls));
        } else {
            file.removedClasses.slice(0, 10).forEach(cls => console.log('      - .' + cls));
            console.log('      ... and', file.removedClasses.length - 10, 'more');
        }
        console.log('');
    });
}

console.log('CSS cleanup complete!\n');
