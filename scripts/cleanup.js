const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const excludeDirs = ['node_modules', 'build', '.git', 'scripts'];

const stats = {
    consoleLogs: {filesProcessed: 0, logsRemoved: 0},
    css: {filesProcessed: 0, classesRemoved: 0, linesRemoved: 0}
};

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
            let j = i;

            for (let char of line) {
                if (escaped) { escaped = false; continue; }
                if (char === '\\') { escaped = true; continue; }
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
                for (let char of lines[j]) {
                    if (escaped) { escaped = false; continue; }
                    if (char === '\\') { escaped = true; continue; }
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
                if (escaped) { escaped = false; continue; }
                if (char === '\\') { escaped = true; continue; }
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

    return {content: newLines.join('\n'), removedCount};
}

function processJsFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const {content: newContent, removedCount} = removeConsoleLogs(content);

        if (removedCount > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            stats.consoleLogs.logsRemoved += removedCount;
        }
        stats.consoleLogs.filesProcessed++;
    } catch {}
}

function extractClassNames(cssContent) {
    const classNames = new Set();
    const lines = cssContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('.')) {
            const match = trimmed.match(/^\.([\w-]+)(?:\s|:|,|\{)/);
            if (match && !trimmed.includes('@media') && !trimmed.includes(' th:') && !trimmed.includes(' td:')) {
                const beforeClass = trimmed.substring(0, trimmed.indexOf('.' + match[1]));
                if (!beforeClass.trim() || beforeClass.trim().endsWith(',')) {
                    classNames.add(match[1]);
                }
            }
        }
    }
    return Array.from(classNames);
}

function isClassUsed(className, cssFilePath) {
    try {
        const grepCommand = `grep -r "\\b${className}\\b" "${srcDir}" --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build -l 2>/dev/null || true`;
        const result = execSync(grepCommand, {encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024});
        const files = result.trim().split('\n').filter(f => f && !f.includes(cssFilePath) && !f.endsWith('.css'));
        return files.length > 0;
    } catch {
        return true;
    }
}

function isPartOfCommaSeparatedSelector(lines, startIndex) {
    for (let i = startIndex - 1; i >= Math.max(0, startIndex - 10); i--) {
        const line = lines[i].trim();
        if (line.includes('{')) return false;
        if (line.endsWith(',')) return true;
        if (line === '') continue;
        if (!line.endsWith(',') && line !== '') return false;
    }
    return false;
}

function removeUnusedClasses(cssContent, unusedClasses) {
    const lines = cssContent.split('\n');
    const result = [];
    let i = 0;
    let removedCount = 0;

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
                    removedCount++;
                }
            }
        } else {
            result.push(line);
            i++;
        }
    }

    let newContent = result.join('\n');
    newContent = newContent.replace(/\n\n\n+/g, '\n\n');
    const linesRemoved = lines.length - newContent.split('\n').length;

    return {newContent, removedCount, linesRemoved};
}

function processCssFile(cssFilePath) {
    try {
        const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
        const classNames = extractClassNames(cssContent);
        const unusedClasses = classNames.filter(cn => !isClassUsed(cn, cssFilePath));

        if (unusedClasses.length === 0) {
            stats.css.filesProcessed++;
            return;
        }

        const {newContent, removedCount, linesRemoved} = removeUnusedClasses(cssContent, unusedClasses);
        fs.writeFileSync(cssFilePath, newContent, 'utf-8');

        stats.css.filesProcessed++;
        stats.css.classesRemoved += removedCount;
        stats.css.linesRemoved += linesRemoved;
    } catch {}
}

function traverseDirectory(dirPath) {
    try {
        const entries = fs.readdirSync(dirPath, {withFileTypes: true});

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                if (!excludeDirs.includes(entry.name)) {
                    traverseDirectory(fullPath);
                }
            } else if (entry.isFile()) {
                if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
                    processJsFile(fullPath);
                } else if (entry.name.endsWith('.css')) {
                    processCssFile(fullPath);
                }
            }
        }
    } catch {}
}

function run() {
    console.log('Running cleanup...');
    traverseDirectory(rootDir);

    const hasChanges = stats.consoleLogs.logsRemoved > 0 || stats.css.classesRemoved > 0;

    if (stats.consoleLogs.logsRemoved > 0) {
        console.log(`  Removed ${stats.consoleLogs.logsRemoved} console.log(s)`);
    }
    if (stats.css.classesRemoved > 0) {
        console.log(`  Removed ${stats.css.classesRemoved} unused CSS classes (${stats.css.linesRemoved} lines)`);
    }
    if (!hasChanges) {
        console.log('  No cleanup needed');
    }

    return hasChanges;
}

if (require.main === module) {
    run();
}

module.exports = {run};
