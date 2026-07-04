#!/usr/bin/env node

/**
 * Supabase CLI wrapper script.
 *
 * Locates the Supabase CLI binary through multiple resolution strategies
 * (env var, well-known paths, PATH lookup, npm global bin, npx fallback)
 * and forwards all arguments to it. Ensures consistent CLI access across
 * different developer environments without requiring a specific install method.
 */

const { spawnSync } = require('child_process')
const { join } = require('path')
const fs = require('fs')

/**
 * Safely checks whether a filesystem path exists.
 * @param {string} p - Absolute path to check.
 * @returns {boolean} `true` if the path exists, `false` otherwise.
 */
function exists(p) {
    try {
        return fs.existsSync(p)
    } catch (_) {
        return false
    }
}

/**
 * Resolves the absolute path of a binary using the system `which` command.
 * @param {string} bin - Binary name to locate.
 * @returns {string|null} Absolute path if found, `null` otherwise.
 */
function which(bin) {
    const r = spawnSync('which', [bin], { encoding: 'utf8' })
    if (r.status === 0) {
        const p = r.stdout.trim()
        if (p) return p
    }
    return null
}

/**
 * Returns the npm global `bin` directory path.
 * @returns {string|null} Global bin directory, or `null` if resolution fails.
 */
function npmGlobalBin() {
    const r = spawnSync('npm', ['bin', '-g'], { encoding: 'utf8' })
    if (r.status === 0) {
        return r.stdout.trim()
    }
    return null
}

/**
 * Searches for the Supabase CLI binary using a cascading resolution strategy:
 * 1. `SUPABASE_BIN` environment variable (explicit override)
 * 2. Common Homebrew/system install paths
 * 3. System PATH via `which`
 * 4. npm global bin directory
 * @returns {string|null} Absolute path to the Supabase binary, or `null` if not found.
 */
function findSupabase() {
    if (process.env.SUPABASE_BIN && exists(process.env.SUPABASE_BIN)) return process.env.SUPABASE_BIN
    const candidates = ['/opt/homebrew/bin/supabase', '/usr/local/bin/supabase']
    for (const c of candidates) {
        if (exists(c)) return c
    }
    const w = which('supabase')
    if (w) return w
    const g = npmGlobalBin()
    if (g) {
        const p = join(g, 'supabase')
        if (exists(p)) return p
    }
    return null
}

/**
 * Executes a binary synchronously, inheriting stdio for interactive use.
 * @param {string} bin - Path to the binary.
 * @param {string[]} args - Arguments to forward.
 * @returns {import('child_process').SpawnSyncReturns<Buffer>}
 */
function run(bin, args) {
    return spawnSync(bin, args, { stdio: 'inherit', env: process.env })
}

/**
 * Last-resort fallback: runs Supabase CLI via `npx` auto-install.
 * @param {string[]} args - Arguments to forward to the Supabase CLI.
 * @returns {import('child_process').SpawnSyncReturns<Buffer>}
 */
function tryNpx(args) {
    return spawnSync('npx', ['-y', 'supabase', ...args], { stdio: 'inherit', env: process.env })
}

// --- Entry point: resolve CLI binary and forward all arguments ---

const args = process.argv.slice(2)
let bin = findSupabase()
let result
if (bin) {
    result = run(bin, args)
    if (typeof result.status === 'number') process.exit(result.status)
    process.exit(1)
} else {
    // Fall back to npx when no local/global installation is found
    const r = tryNpx(args)
    if (typeof r.status === 'number') process.exit(r.status)
    console.error(
        'Supabase CLI not found. Install with Homebrew or npm: brew install supabase/tap/supabase or npm i -g supabase'
    )
    process.exit(1)
}
