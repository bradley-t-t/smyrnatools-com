const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const excludeDirs = ['node_modules', 'build', '.git', 'scripts'];

let filesProcessed = 0;
let logsRemoved = 0;

function shouldProcessFile(filePath) {
    return filePath.endsWith('.js') || filePath.endsWith('.jsx');
}

function removeConsoleLogs(content) {
    let removedCount = 0;
    
    const lines = content.split('\n');
    const newLines = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (trimmed.startsWith('console.log(')) {
            let bracketCount = 0;
            let inString = false;
            let stringChar = null;
            let escaped = false;
            let fullStatement = line;
            let j = i;
            
            for (let char of line) {
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (char === '\\') {
                    escaped = true;
                    continue;
                }
                if ((char === '"' || char === "'" || char === '`') && !inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar && inString) {
                    inString = false;
                    stringChar = null;
                }
                if (!inString) {
                    if (char === '(') bracketCount++;
                    if (char === ')') bracketCount--;
                }
            }
            
            while (bracketCount > 0 && j < lines.length - 1) {
                j++;
                fullStatement += '\n' + lines[j];
                for (let char of lines[j]) {
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    if ((char === '"' || char === "'" || char === '`') && !inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar && inString) {
                        inString = false;
                        stringChar = null;
                    }
                    if (!inString) {
                        if (char === '(') bracketCount++;
                        if (char === ')') bracketCount--;
                    }
                }
            }
            
            removedCount++;
            i = j + 1;
            continue;
        }
        
        const consoleLogMatch = line.match(/console\.log\s*\(/);
        if (consoleLogMatch) {
            const beforeConsole = line.substring(0, consoleLogMatch.index);
            const afterConsole = line.substring(consoleLogMatch.index);
            
            let bracketCount = 0;
            let inString = false;
            let stringChar = null;
            let escaped = false;
            let endIndex = -1;
            
            for (let k = 0; k < afterConsole.length; k++) {
                const char = afterConsole[k];
                
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (char === '\\') {
                    escaped = true;
                    continue;
                }
                if ((char === '"' || char === "'" || char === '`') && !inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar && inString) {
                    inString = false;
                    stringChar = null;
                }
                if (!inString) {
                    if (char === '(') bracketCount++;
                    if (char === ')') {
                        bracketCount--;
                        if (bracketCount === 0) {
                            endIndex = k;
                            break;
                        }
                    }
                }
            }
            
            if (endIndex !== -1) {
                const afterLog = afterConsole.substring(endIndex + 1);
                const reconstructed = beforeConsole + afterLog;
                
                if (reconstructed.trim().length > 0) {
                    newLines.push(reconstructed);
                }
                removedCount++;
                i++;
                continue;
            }
        }
        
        newLines.push(line);
        i++;
    }
    
    return { content: newLines.join('\n'), removedCount };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { content: newContent, removedCount } = removeConsoleLogs(content);
        
        if (removedCount > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✓ ${path.relative(rootDir, filePath)} - Removed ${removedCount} console.log(s)`);
            logsRemoved += removedCount;
        }
        
        filesProcessed++;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
    }
}

function traverseDirectory(dirPath) {
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                if (!excludeDirs.includes(entry.name)) {
                    traverseDirectory(fullPath);
                }
            } else if (entry.isFile() && shouldProcessFile(entry.name)) {
                processFile(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error.message);
    }
}

console.log('🔍 Scanning for console.log statements...\n');

traverseDirectory(rootDir);

console.log('\n✅ Done!');
console.log(`📁 Files processed: ${filesProcessed}`);
console.log(`🗑️  console.log statements removed: ${logsRemoved}`);
