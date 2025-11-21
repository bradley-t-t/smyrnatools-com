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
                    console.error('Error accessing:', fullPath, statError.message);
                }
            }
        } catch (error) {
            console.error('Error scanning directory', directory, ':', error.message);
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
        if (line.startsWith('.') && line.includes('{')) {
            const match = line.match(/^\.([\w-]+)/);
            if (match) {
                classNames.add(match[1]);
            }
        }
    }
    
    return Array.from(classNames);
}

function isClassUsed(className, searchDir, cssFilePath) {
    try {
        const grepCommand = `grep -r "\\b${className}\\b" ${searchDir} --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build -l 2>/dev/null || true`;
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

function removeUnusedClasses(cssContent, unusedClasses) {
    let newContent = cssContent;
    let removedCount = 0;
    
    for (const className of unusedClasses) {
        const lines = newContent.split('\n');
        const newLines = [];
        let skip = false;
        let braceCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (!skip && trimmed.startsWith(`.${className}`) && (trimmed.includes('{') || trimmed.includes(','))) {
                if (trimmed.includes(',')) {
                    newLines.push(line);
                } else {
                    skip = true;
                    braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                    if (braceCount <= 0) {
                        skip = false;
                        removedCount++;
                    }
                }
            } else if (skip) {
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                if (braceCount <= 0) {
                    skip = false;
                    removedCount++;
                }
            } else {
                newLines.push(line);
            }
        }
        
        newContent = newLines.join('\n');
    }
    
    newContent = newContent.replace(/\n\n\n+/g, '\n\n');
    
    return { newContent, removedCount };
}

function processCssFile(cssFilePath, searchDir) {
    console.log('\n' + '='.repeat(60));
    console.log('Processing:', cssFilePath);
    console.log('='.repeat(60));
    
    const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
    const classNames = extractClassNames(cssContent);
    
    console.log('Found', classNames.length, 'unique CSS classes');
    
    const usedClasses = new Set();
    const unusedClasses = [];
    
    let checked = 0;
    const total = classNames.length;
    
    for (const className of classNames) {
        checked++;
        process.stdout.write(`\rChecking: ${checked}/${total} (${Math.round(checked/total*100)}%)`);
        
        if (isClassUsed(className, searchDir, cssFilePath)) {
            usedClasses.add(className);
        } else {
            unusedClasses.push(className);
        }
    }
    
    console.log(`\nUsed: ${usedClasses.size} | Unused: ${unusedClasses.length}`);
    
    if (unusedClasses.length === 0) {
        console.log('No unused classes found!');
        return { processed: true, removed: 0, linesRemoved: 0 };
    }
    
    console.log(`\nRemoving ${unusedClasses.length} unused classes:`);
    unusedClasses.slice(0, 10).forEach((className, index) => {
        console.log(`   ${index + 1}. .${className}`);
    });
    if (unusedClasses.length > 10) {
        console.log(`   ... and ${unusedClasses.length - 10} more`);
    }
    
    const { newContent, removedCount } = removeUnusedClasses(cssContent, unusedClasses);
    
    fs.writeFileSync(cssFilePath, newContent, 'utf-8');
    
    const originalLines = cssContent.split('\n').length;
    const newLines = newContent.split('\n').length;
    const linesRemoved = originalLines - newLines;
    
    console.log('Cleaned:', removedCount, 'classes removed,', linesRemoved, 'lines reduced');
    console.log('  ', originalLines, '->', newLines, 'lines');
    
    return { processed: true, removed: removedCount, linesRemoved };
}

const cssFiles = findCssFiles(cssDir);

if (cssFiles.length === 0) {
    console.log('No CSS files found in', cssDir, '\n');
    process.exit(1);
}

console.log('Found', cssFiles.length, 'CSS file(s):\n');
cssFiles.forEach((file, index) => {
    console.log('  ', index + 1 + '.', file);
});

const results = {
    totalFiles: cssFiles.length,
    processedFiles: 0,
    totalRemoved: 0,
    totalLinesRemoved: 0
};

for (const cssFile of cssFiles) {
    try {
        const result = processCssFile(cssFile, searchDir);
        results.processedFiles++;
        results.totalRemoved += result.removed;
        results.totalLinesRemoved += result.linesRemoved;
    } catch (error) {
        console.error('\nError processing', cssFile, ':', error.message);
    }
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log('Files processed:', results.processedFiles + '/' + results.totalFiles);
console.log('Total classes removed:', results.totalRemoved);
console.log('Total lines removed:', results.totalLinesRemoved);
console.log('='.repeat(60) + '\n');

console.log('CSS cleanup complete!\n');
