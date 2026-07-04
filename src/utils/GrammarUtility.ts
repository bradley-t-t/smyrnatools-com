/**
 * Text normalization engine: applies sentence-case, preserves industry acronyms (DOT, VIN, OSHA, etc.),
 * normalizes whitespace, enforces period-termination, and formats phone numbers.
 */
const ACRONYMS = new Set([
    'USA',
    'CAT',
    'KOMATSU',
    'IT',
    'ICS',
    'OSHA',
    'DOT',
    'HVAC',
    'PTO',
    'ETA',
    'ASAP',
    'ID',
    'API',
    'CPU',
    'GPU',
    'SQL',
    'KPI',
    'QA',
    'QC',
    'ERP',
    'GPS',
    'VIN',
    'SKU',
    'PO',
    'ETD',
    'EOD',
    'COB',
    'FOB',
    'RFID',
    'HTTP',
    'HTTPS',
    'UPS',
    'PPE',
    'QAQC',
    'OEM',
    'OEE'
])
function normalizeWhitespace(text: string | null | undefined): string {
    if (!text) return ''
    return String(text)
        .replace(/[\u00A0\t]+/g, ' ')
        .replace(/\s*\n\s*/g, '\n')
        .replace(/\s{2,}/g, ' ')
        .trim()
}
function splitIntoSegments(text: string | null | undefined): string[] {
    if (!text) return []
    const withNormalizedNewlines = text.replace(/\r\n?/g, '\n')
    const parts: string[] = []
    let buffer = ''
    for (let i = 0; i < withNormalizedNewlines.length; i++) {
        const ch = withNormalizedNewlines[i]
        buffer += ch
        const isEnd = /[.!?]/.test(ch)
        if (isEnd) {
            const next = withNormalizedNewlines[i + 1] || ''
            if (/[\s\n]/.test(next) || next === '') {
                parts.push(buffer)
                buffer = ''
            }
        } else if (ch === '\n') {
            if (buffer.trim()) parts.push(buffer)
            buffer = ''
        }
    }
    if (buffer.trim()) parts.push(buffer)
    return parts
}
function mostlyUppercase(s: string): boolean {
    const letters = s.replace(/[^A-Za-z]/g, '')
    if (!letters) return false
    const uppers = (letters.match(/[A-Z]/g) || []).length
    return uppers / letters.length >= 0.7
}
function restoreAcronyms(text: string): string {
    return text.replace(/\b([A-Za-z]{2,6})\b/g, (m, w: string) => {
        const up = w.toUpperCase()
        if (ACRONYMS.has(up)) return up
        return m
    })
}
function sentenceCase(sentence: string): string {
    let s = sentence.trim()
    if (!s) return ''
    if (mostlyUppercase(s)) s = s.toLowerCase()
    s = s.replace(/\s*([,;:])\s*/g, ' $1 ')
    s = s.replace(/\s{2,}/g, ' ').trim()
    s = s.replace(/\s+(\.)$/g, '$1')
    s = s.replace(/\s+([!?])$/g, '$1')
    s = s.replace(/^(\W*)([a-zA-Z])(.*)$/s, (_, p: string, c: string, rest: string) => p + c.toUpperCase() + rest)
    s = s.replace(/\b([A-Z]{3,})\b/g, (w) => (ACRONYMS.has(w) ? w : w.toLowerCase()))
    s = s.replace(/\b([A-Z]{2})\b/g, (w) => (ACRONYMS.has(w) ? w : w.toLowerCase()))
    s = restoreAcronyms(s)
    s = s.replace(/[!?]+$/g, '.')
    s = s.replace(/[,;:]$/g, '.')
    if (!/[.?!]$/.test(s)) s += '.'
    s = s.replace(/\.[\s.]+\./g, '.').replace(/\.{2,}/g, '.')
    return s
}
function cleanText(text: string | null | undefined): string {
    const base = normalizeWhitespace(text)
    if (!base) return ''
    const segments = splitIntoSegments(base)
    return segments
        .map(sentenceCase)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}
function cleanDescription(text: string | null | undefined): string {
    return cleanText(text)
}
function cleanComments(text: string | null | undefined): string {
    const t = typeof text === 'string' ? text : ''
    const lines = t.replace(/\r\n?/g, '\n').split('\n')
    const cleanedLines = lines.map((l) => cleanText(l))
    return cleanedLines.join('\n').trim()
}
function formatPhone(input: string | number | null | undefined): string {
    const raw = input == null ? '' : String(input)
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
        const d = digits.slice(1)
        return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6, 10)}`
    }
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
    return raw.trim()
}
const GrammarUtility = { cleanComments, cleanDescription, formatPhone }
export default GrammarUtility
export { cleanText, formatPhone, GrammarUtility }
