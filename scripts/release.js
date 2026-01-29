const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {run: runCleanup} = require('./cleanup');

const versionPath = path.join(__dirname, '../public/version.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const envPath = path.join(__dirname, '../.env');

function loadEnv() {
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        });
    } catch {}
}

loadEnv();

function getCurrentVersion() {
    const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    return data.version;
}

function incrementVersion(current) {
    const [major, minor] = current.split('.').map(Number);
    if (minor >= 9) {
        return `${major + 1}.0`;
    }
    return `${major}.${minor + 1}`;
}

function saveVersion(version) {
    fs.writeFileSync(versionPath, JSON.stringify({version}, null, 2) + '\n');
}

function getChangedFiles() {
    try {
        const staged = execSync('git diff --cached --name-only', {encoding: 'utf8'}).trim();
        if (staged) return staged;
        const unstaged = execSync('git diff --name-only', {encoding: 'utf8'}).trim();
        if (unstaged) return unstaged;
        return execSync('git diff HEAD~1 --name-only', {encoding: 'utf8'}).trim();
    } catch {
        return '';
    }
}

function getActualCodeDiff() {
    try {
        const staged = execSync('git diff --cached -U3', {encoding: 'utf8', maxBuffer: 1024 * 1024 * 10}).trim();
        if (staged) return staged;
        const unstaged = execSync('git diff -U3', {encoding: 'utf8', maxBuffer: 1024 * 1024 * 10}).trim();
        if (unstaged) return unstaged;
        return '';
    } catch {
        return '';
    }
}

function getDetailedChanges() {
    try {
        const staged = execSync('git diff --cached --stat', {encoding: 'utf8'}).trim();
        if (staged) return staged;
        return execSync('git diff --stat', {encoding: 'utf8'}).trim();
    } catch {
        return '';
    }
}

function getCurrentDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function truncateDiff(diff, maxLength = 8000) {
    if (diff.length <= maxLength) return diff;
    return diff.slice(0, maxLength) + '\n... (truncated)';
}

async function generateChangelogEntry(changedFiles, codeDiff, detailedChanges, newVersion) {
    const apiKey = process.env.REACT_APP_GROK_API_KEY;
    const date = getCurrentDate();

    if (!apiKey || !codeDiff) {
        if (!codeDiff) {
            return `## [${newVersion}] - ${date}\n\n- Code formatting and cleanup\n`;
        }
        return `## [${newVersion}] - ${date}\n\n- Version update\n`;
    }

    const prompt = `Analyze this git diff and generate a changelog entry for version ${newVersion}. Date: ${date}

ACTUAL CODE CHANGES (git diff):
${truncateDiff(codeDiff)}

Changed files:
${changedFiles}

Statistics:
${detailedChanges}

IMPORTANT RULES:
- Start with "## [${newVersion}] - ${date}"
- Add blank line after header
- ONLY list changes that are ACTUALLY visible in the diff above
- If the diff only shows formatting/whitespace changes, say "- Code formatting and cleanup"
- Do NOT make up features or changes that aren't in the diff
- Be specific and accurate based on the actual code changes
- List changes as bullet points with "- " prefix
- Max 8 bullet points
- No emojis
- Just return the changelog entry, nothing else`;

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'grok-3-latest',
                messages: [{role: 'user', content: prompt}],
                max_tokens: 400,
                temperature: 0.2
            })
        });

        const data = await response.json();
        const entry = data.choices?.[0]?.message?.content?.trim();

        if (entry) {
            return entry;
        }
    } catch (error) {
        console.log('AI changelog generation failed, using default');
    }

    return `## [${newVersion}] - ${date}\n\n- Version update\n`;
}

function formatChangelog(content) {
    const lines = content.split('\n');
    const formatted = [];
    let prevWasEmpty = false;
    let prevWasHeader = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const isEmpty = trimmed === '';
        const isVersionHeader = trimmed.startsWith('## [');
        const isBullet = trimmed.startsWith('- ');

        if (isEmpty) {
            if (!prevWasEmpty && formatted.length > 0) {
                formatted.push('');
            }
            prevWasEmpty = true;
            prevWasHeader = false;
            continue;
        }

        if (isVersionHeader && !prevWasEmpty && formatted.length > 0) {
            formatted.push('');
        }

        if (prevWasHeader && isBullet && prevWasEmpty) {
            formatted.pop();
        }

        formatted.push(trimmed);
        prevWasEmpty = false;
        prevWasHeader = isVersionHeader;
    }

    while (formatted.length > 0 && formatted[formatted.length - 1] === '') {
        formatted.pop();
    }

    return formatted.join('\n') + '\n';
}

function updateChangelog(newEntry) {
    let changelog = '';
    try {
        changelog = fs.readFileSync(changelogPath, 'utf8');
    } catch {
        changelog = '# Changelog\n\nAll notable changes to SmyrnaTools will be documented in this file.\n';
    }

    const headerEnd = changelog.indexOf('\n## ');
    if (headerEnd === -1) {
        changelog = changelog.trimEnd() + '\n\n' + newEntry + '\n';
    } else {
        changelog = changelog.slice(0, headerEnd) + '\n\n' + newEntry + '\n' + changelog.slice(headerEnd + 1);
    }

    changelog = formatChangelog(changelog);
    fs.writeFileSync(changelogPath, changelog);
}

async function generateCommitMessage(changedFiles, codeDiff, detailedChanges, oldVersion, newVersion) {
    const apiKey = process.env.REACT_APP_GROK_API_KEY;

    if (!apiKey) {
        console.log('No REACT_APP_GROK_API_KEY found in .env, using default commit message');
        return `SmyrnaTools Release: v${newVersion}`;
    }

    const prompt = `Analyze this git diff and generate a commit message. Version bump from ${oldVersion} to ${newVersion}.

ACTUAL CODE CHANGES (git diff):
${truncateDiff(codeDiff)}

Changed files:
${changedFiles}

Statistics:
${detailedChanges}

IMPORTANT RULES:
- First line MUST be exactly: "SmyrnaTools Release: v${newVersion}"
- Add blank line after first line
- ONLY list changes that are ACTUALLY visible in the diff above
- If the diff only shows formatting/whitespace changes, say "- Code formatting and cleanup"
- Do NOT make up features or changes that aren't in the diff
- Be specific and accurate based on the actual code changes
- Use "- " prefix for each bullet point
- Max 8 bullet points
- No emojis
- Just return the commit message, nothing else`;

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'grok-3-latest',
                messages: [{role: 'user', content: prompt}],
                max_tokens: 500,
                temperature: 0.2
            })
        });

        const data = await response.json();
        const message = data.choices?.[0]?.message?.content?.trim();

        if (message) {
            return message;
        }
    } catch (error) {
        console.log('AI generation failed, using default message');
    }

    return `SmyrnaTools Release: v${newVersion}\n\n- Version bump`;
}

async function main() {
    const oldVersion = getCurrentVersion();
    const newVersion = incrementVersion(oldVersion);

    console.log(`Version: ${oldVersion} -> ${newVersion}`);

    console.log('\nRunning cleanup...');
    try {
        runCleanup();
    } catch (error) {
        console.log('Cleanup skipped');
    }

    console.log('\nFormatting code...');
    try {
        execSync('npm run format', {stdio: 'inherit'});
        console.log('Code formatted');
    } catch (error) {
        console.log('Format skipped (prettier may not be installed)');
    }

    const originalChangedFiles = getChangedFiles();
    const originalCodeDiff = getActualCodeDiff();
    const originalDetailedChanges = getDetailedChanges();

    console.log('\nOriginal changes detected:');
    console.log(originalChangedFiles || 'No changes detected');

    if (!originalChangedFiles && !originalCodeDiff) {
        console.log('\nNo changes to release. Exiting.');
        process.exit(0);
    }

    saveVersion(newVersion);
    console.log('\nUpdated version.json');

    console.log('\nGenerating changelog entry...');
    const changelogEntry = await generateChangelogEntry(originalChangedFiles, originalCodeDiff, originalDetailedChanges, newVersion);
    updateChangelog(changelogEntry);
    console.log('Updated CHANGELOG.md');

    console.log('\nBuilding production...');
    try {
        execSync('npm run build', {stdio: 'inherit'});
        console.log('Build complete');
    } catch (error) {
        console.error('Build failed:', error.message);
        process.exit(1);
    }

    execSync('git add -A', {stdio: 'inherit'});

    const commitMessage = await generateCommitMessage(originalChangedFiles, originalCodeDiff, originalDetailedChanges, oldVersion, newVersion);
    console.log(`\nCommit message:\n${commitMessage}`);

    const commitMsgPath = path.join(__dirname, '../.commitmsg');
    try {
        fs.writeFileSync(commitMsgPath, commitMessage);
        execSync(`git commit -F "${commitMsgPath}"`, {stdio: 'inherit'});
        fs.unlinkSync(commitMsgPath);
        console.log('\nCommitted successfully');

        execSync('git push origin core', {stdio: 'inherit'});
        console.log('Pushed to GitHub');
    } catch (error) {
        try { fs.unlinkSync(commitMsgPath); } catch {}
        console.error('Git operation failed:', error.message);
        process.exit(1);
    }

    console.log(`\nSmyrnaTools Release ${newVersion} complete!`);
}

main();