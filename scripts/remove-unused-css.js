#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cssFilePath = process.argv[2];
const searchDir = process.argv[3] || './src';

if (!cssFilePath) {
    console.error('Usage: node scripts/remove-unused-css.js <path-to-css-file> [search-directory]');
    console.error('Example: node scripts/remove-unused-css.js ./src/views/reports/styles/Reports.css ./src');
    process.exit(1);
}

if (!fs.existsSync(cssFilePath)) {
    console.error(`Error: CSS file not found: ${cssFilePath}`);
    process.exit(1);
}

console.log(`\n🔍 Analyzing CSS file: ${cssFilePath}`);
console.log(`📂 Searching in directory: ${searchDir}\n`);

const cssContent = fs.readFileSync(cssFilePath, 'utf-8');

const classNameRegex = /^\.([\w-]+)(?:\s|:|,|\{|\.)/gm;
const classNames = [];
let match;

while ((match = classNameRegex.exec(cssContent)) !== null) {
    const className = match[1];
    if (!classNames.includes(className)) {
        classNames.push(className);
    }
}

console.log(`📊 Found ${classNames.length} unique CSS classes\n`);

const usedClasses = new Set();
const unusedClasses = [];

let checked = 0;
const total = classNames.length;

for (const className of classNames) {
    checked++;
    process.stdout.write(`\r⏳ Checking classes: ${checked}/${total}`);
    
    try {
        const grepCommand = `grep -r "${className}" ${searchDir} --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts" -l 2>/dev/null || true`;
        const result = execSync(grepCommand, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        
        const files = result.trim().split('\n').filter(f => f && !f.includes(cssFilePath));
        
        if (files.length > 0) {
            usedClasses.add(className);
        } else {
            unusedClasses.push(className);
        }
    } catch (error) {
        console.error(`\nError checking class: ${className}`);
    }
}

console.log(`\n\n✅ Used classes: ${usedClasses.size}`);
console.log(`❌ Unused classes: ${unusedClasses.length}\n`);

if (unusedClasses.length === 0) {
    console.log('�� No unused CSS classes found! Your CSS is clean.\n');
    process.exit(0);
}

console.log('📋 Unused CSS classes:');
console.log('─'.repeat(50));
unusedClasses.forEach((className, index) => {
    console.log(`${(index + 1).toString().padStart(3)}. .${className}`);
});
console.log('─'.repeat(50));

console.log('\n⚠️  Would you like to remove these unused classes?');
console.log('This will create a backup of your CSS file.\n');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Remove unused classes? (yes/no): ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('\n❌ Aborted. No changes made.\n');
        process.exit(0);
    }
    
    const backupPath = `${cssFilePath}.backup-${Date.now()}`;
    fs.copyFileSync(cssFilePath, backupPath);
    console.log(`\n💾 Backup created: ${backupPath}`);
    
    let newCssContent = cssContent;
    let removedCount = 0;
    
    for (const className of unusedClasses) {
        const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const singleLineRegex = new RegExp(
            `\\.${escapedClassName}(?:\\s*:\\s*[\\w-]+)?\\s*\\{[^}]*\\}\\s*`,
            'g'
        );
        
        const multiLineRegex = new RegExp(
            `\\.${escapedClassName}(?:\\s*:\\s*[\\w-]+)?\\s*\\{[^}]*\\}`,
            'gs'
        );
        
        const nestedRegex = new RegExp(
            `\\.${escapedClassName}(?:\\s+[.\\w-]+)?\\s*\\{(?:[^{}]|\\{[^{}]*\\})*\\}`,
            'gs'
        );
        
        const beforeLength = newCssContent.length;
        newCssContent = newCssContent.replace(singleLineRegex, '');
        newCssContent = newCssContent.replace(multiLineRegex, '');
        newCssContent = newCssContent.replace(nestedRegex, '');
        
        if (newCssContent.length < beforeLength) {
            removedCount++;
        }
    }
    
    newCssContent = newCssContent.replace(/\n\n\n+/g, '\n\n');
    
    fs.writeFileSync(cssFilePath, newCssContent, 'utf-8');
    
    const originalLines = cssContent.split('\n').length;
    const newLines = newCssContent.split('\n').length;
    const linesRemoved = originalLines - newLines;
    
    console.log(`\n✨ CSS cleanup complete!`);
    console.log(`   - Removed ${removedCount} unused class definitions`);
    console.log(`   - Reduced file by ${linesRemoved} lines`);
    console.log(`   - Original: ${originalLines} lines`);
    console.log(`   - New: ${newLines} lines`);
    console.log(`\n📁 Updated file: ${cssFilePath}`);
    console.log(`💾 Backup saved: ${backupPath}\n`);
    
    console.log('💡 Tip: Review the changes and run your tests to ensure everything works!\n');
});
