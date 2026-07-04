/**
 * Daily Plan email — built per-plant from the dispatcher's saved plan and
 * sent to that plant's manager (plus the district manager who owns the
 * plant on CC). The HTML uses inline styles exclusively (Gmail / Outlook
 * strip `<style>` blocks); the slightly verbose markup is the table-driven
 * layout that survives every major client without falling over on dark
 * mode or narrow viewports.
 *
 * `testMode = true` injects the amber "redirected" banner at the top of
 * the message with the actual intended TO + CC the routing logic
 * produced so we can verify each plant's manager / DM lookup before
 * flipping the redirect off in production.
 *
 * Visual language:
 *   • Brand red (#c12033) on the top stripe — Smyrna identity.
 *   • Navy (#1e3a5f) on section headers + footer accents — calmer than
 *     the brand red and prevents the email from screaming throughout.
 *   • Plenty of whitespace, a hero KPI row instead of three small tiles,
 *     and "needs help" orders flagged with a left rail so the manager
 *     can scan for risk in one glance.
 */

import { renderBadgeHtml } from './badgeHtml.js'

const ACCENT = '#c12033'
const ACCENT_DARK = '#8a1521'
const NAVY = '#1e3a5f'
const NAVY_DARK = '#0f1f33'
const INK = '#0f172a'
const INK_MUTED = '#475569'
const INK_SOFT = '#64748b'
const INK_FAINT = '#94a3b8'
const BORDER = '#e2e8f0'
const SURFACE = '#f8fafc'
const SURFACE_ALT = '#f1f5f9'

function htmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/** Trim, single-space-collapse, sentence-capitalize, and ensure a trailing
 *  period — keeps dispatcher notes readable in an email body without
 *  rewriting the actual sentences. Multi-line notes are kept intact:
 *  each non-empty line is normalized independently. */
function normalizeNotes(raw) {
    if (!raw) return ''
    const lines = String(raw)
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((line) => {
            const capped = line.charAt(0).toUpperCase() + line.slice(1)
            return /[.!?]$/.test(capped) ? capped : `${capped}.`
        })
    return lines.join('\n')
}

function formatLongDate(planDateIso) {
    if (!planDateIso) return ''
    const date = new Date(`${planDateIso}T12:00:00`)
    if (Number.isNaN(date.getTime())) return planDateIso
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', weekday: 'long', year: 'numeric' })
}

function formatShortDate(planDateIso) {
    if (!planDateIso) return ''
    const date = new Date(`${planDateIso}T12:00:00`)
    if (Number.isNaN(date.getTime())) return planDateIso
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' })
}

function formatRecipient(r) {
    if (!r) return ''
    if (r.name) return `${r.name} &lt;${htmlEscape(r.email)}&gt;`
    return htmlEscape(r.email)
}

/** Section header — uppercase eyebrow + thin underline. Pinned navy so
 *  every header in the email reads the same. */
function renderSectionHeader(title, eyebrow) {
    return `
<div style="margin:32px 0 14px;">
    <div style="font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${NAVY};margin-bottom:4px;">${htmlEscape(eyebrow || '')}</div>
    <div style="display:flex;align-items:baseline;border-bottom:2px solid ${NAVY};padding-bottom:10px;">
        <div style="font-size:18px;font-weight:700;color:${INK};line-height:1.2;">${htmlEscape(title)}</div>
    </div>
</div>`
}

function renderTestBanner({ intendedTo, intendedCc, testRedirectEmail, plantLabel }) {
    const toLine = (intendedTo || []).map(formatRecipient).join(', ') || '<em>(no plant manager resolved)</em>'
    const ccLine = (intendedCc || []).map(formatRecipient).join(', ') || '<em>(no district manager resolved)</em>'
    return `
<tr>
    <td style="background:#fef3c7;border-bottom:1px solid #fcd34d;padding:14px 32px;font-size:12.5px;color:#78350f;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;color:#92400e;">
            &#9888; Test mode &middot; message redirected
        </div>
        This message would have been delivered in production to the recipients below for <strong>${htmlEscape(plantLabel)}</strong>. While we are testing the daily-plan pipeline, every email is redirected to <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;">${htmlEscape(testRedirectEmail)}</span> so the routing can be validated before production.
        <div style="margin-top:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;color:#451a03;">
            <div><strong style="color:#78350f;font-size:11.5px;letter-spacing:0.04em;">INTENDED TO:</strong> ${toLine}</div>
            <div style="margin-top:3px;"><strong style="color:#78350f;font-size:11.5px;letter-spacing:0.04em;">INTENDED CC:</strong> ${ccLine}</div>
        </div>
    </td>
</tr>`
}

/** Hero KPI strip — four big numbers, brand-tinted corners on the outer
 *  cards so the eye lands on Orders first, Yardage second. Keeps Loads
 *  and the start/end window subordinate. */
function renderSummaryGrid({ kpi }) {
    const orderCount = Number.isFinite(kpi?.orderCount) ? kpi.orderCount : 0
    const yardage = Number.isFinite(kpi?.yardage) ? kpi.yardage : 0
    const customers = Number.isFinite(kpi?.customerCount) ? kpi.customerCount : 0
    const loads = Number.isFinite(kpi?.loadCount) ? kpi.loadCount : 0
    const windowText =
        kpi?.firstStart && kpi?.lastStart ? `${kpi.firstStart}&nbsp;&ndash;&nbsp;${kpi.lastStart}` : '&mdash;'
    const cell = (label, value, hint, accent) => `
        <td valign="top" width="25%" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:10px;padding:16px 14px;${accent ? `border-top:3px solid ${accent};` : ''}">
            <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${INK_SOFT};margin-bottom:6px;">${label}</div>
            <div style="font-size:24px;font-weight:700;color:${INK};font-variant-numeric:tabular-nums;line-height:1.05;">${value}</div>
            ${hint ? `<div style="font-size:11px;color:${INK_FAINT};margin-top:6px;">${hint}</div>` : ''}
        </td>`
    return `
<table role="presentation" cellspacing="10" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:10px;margin:0 -10px 4px;">
    <tr>
        ${cell('Orders', orderCount.toLocaleString(), `${customers} customer${customers === 1 ? '' : 's'}`, ACCENT)}
        ${cell('Yardage', `${Math.round(yardage).toLocaleString()} <span style="font-size:13px;color:${INK_SOFT};font-weight:500;">yd&sup3;</span>`, 'scheduled volume', null)}
        ${cell('Loads', loads.toLocaleString(), 'truck loads', null)}
        ${cell('Window', windowText, 'first &rarr; last start', NAVY)}
    </tr>
</table>`
}

function renderOrdersTable({ orders }) {
    if (!Array.isArray(orders) || orders.length === 0) {
        return `<div style="font-size:12.5px;color:${INK_SOFT};padding:16px;background:${SURFACE};border-radius:10px;border:1px solid ${BORDER};">No orders scheduled for this plant today.</div>`
    }
    const rows = orders
        .map((order, idx) => {
            const start = htmlEscape(order.startTime || '—')
            const orderNum = order.orderNum ? `#${htmlEscape(order.orderNum)}` : '—'
            const customer = htmlEscape(order.customer || 'Unknown customer')
            const subline = [order.address, order.productCode].filter(Boolean).map(htmlEscape).join(' &middot; ')
            const yards = Number.isFinite(order.yardage) ? Math.round(order.yardage).toLocaleString() : '—'
            const trucks = Number.isFinite(order.truckCount) ? order.truckCount : '—'
            const spacing = Number.isFinite(order.spacingMin) ? `${order.spacingMin} min` : '—'
            const status = order.needsHelp
                ? renderBadgeHtml({ label: 'Needs help', tone: 'danger' })
                : renderBadgeHtml({ label: 'Covered', tone: 'success' })
            const isLast = idx === orders.length - 1
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#fbfcfd'
            const cellBase = `padding:12px 12px;vertical-align:top;${isLast ? '' : `border-bottom:1px solid ${SURFACE_ALT};`}background:${rowBg};`
            /* Risk rail — thin red line on the left cell when the order
             * needs help. Lets the manager scan a long table for issues
             * without reading every status pill. */
            const firstCellBase = order.needsHelp
                ? `${cellBase}border-left:3px solid ${ACCENT};`
                : `${cellBase}border-left:3px solid transparent;`
            return `
<tr>
    <td style="${firstCellBase}font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;text-align:right;width:62px;font-weight:600;color:${INK};">${start}</td>
    <td style="${cellBase}font-family:ui-monospace,Menlo,Consolas,monospace;color:${INK_MUTED};font-weight:600;width:80px;">${orderNum}</td>
    <td style="${cellBase}">
        <div style="font-weight:600;color:${INK};">${customer}</div>
        ${subline ? `<div style="font-size:11px;color:${INK_SOFT};margin-top:2px;">${subline}</div>` : ''}
    </td>
    <td style="${cellBase}font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;text-align:right;width:58px;font-weight:600;color:${INK};">${yards}</td>
    <td style="${cellBase}font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;text-align:right;width:60px;color:${INK_MUTED};">${trucks}</td>
    <td style="${cellBase}font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;text-align:right;width:74px;color:${INK_MUTED};">${spacing}</td>
    <td style="${cellBase}width:104px;">${status}</td>
</tr>`
        })
        .join('')
    const th = (label, align) => `
<th style="background:${NAVY};color:#ffffff;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:0.1em;text-align:${align};padding:11px 12px;">${label}</th>`
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;font-size:12.5px;border-radius:10px;overflow:hidden;border:1px solid ${BORDER};">
    <thead>
        <tr>
            ${th('Start', 'right')}
            ${th('Order #', 'left')}
            ${th('Customer', 'left')}
            ${th('Yards', 'right')}
            ${th('Trucks', 'right')}
            ${th('Spacing', 'right')}
            ${th('Status', 'left')}
        </tr>
    </thead>
    <tbody>${rows}</tbody>
</table>`
}

function renderPlantBadge(code, name) {
    if (!code) return ''
    const safeCode = htmlEscape(code)
    const safeName = name ? `&nbsp;<span style="color:${INK_SOFT};font-weight:500;">${htmlEscape(name)}</span>` : ''
    return `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;color:${INK};">${safeCode}</span>${safeName}`
}

function renderHelpRow({ direction, row, isLast }) {
    const counterLabel = renderPlantBadge(row.counterPlantCode, row.counterPlantName)
    const returnsHome = !row.returnPlantCode || row.returnPlantCode === row.counterPlantCode
    const returnLabel = returnsHome ? '' : renderPlantBadge(row.returnPlantCode, row.returnPlantName)
    const arrive = row.arriveTime ? htmlEscape(row.arriveTime) : '—'
    const leave = row.leaveTime ? htmlEscape(row.leaveTime) : ''
    const headline =
        direction === 'in'
            ? `<strong style="color:${INK};">${htmlEscape(row.driverLabel)}</strong> from ${counterLabel}`
            : `<strong style="color:${INK};">${htmlEscape(row.driverLabel)}</strong> to ${counterLabel}`
    const timingParts = []
    if (direction === 'in') {
        timingParts.push(`Arrives <strong style="color:${INK};">${arrive}</strong>`)
        if (leave) timingParts.push(`leaves <strong style="color:${INK};">${leave}</strong>`)
    } else {
        timingParts.push(`Arrives at ${counterLabel} <strong style="color:${INK};">${arrive}</strong>`)
        if (leave) timingParts.push(`leaves <strong style="color:${INK};">${leave}</strong>`)
    }
    const timingLine = `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;color:${INK_MUTED};font-size:11.5px;">${timingParts.join(' &middot; ')}</span>`
    const forOrder = row.forOrder
    const forLine = forOrder
        ? `<div style="font-size:11.5px;color:${INK};margin-top:4px;">
                ${renderBadgeHtml({ label: 'Direct load', marginRight: '6px', tone: 'info' })}
                ${forOrder.orderNum ? `<strong>#${htmlEscape(forOrder.orderNum)}</strong> ` : ''}${htmlEscape(forOrder.customer)}${forOrder.productCode ? ` &middot; <span style="color:${INK_SOFT};">${htmlEscape(forOrder.productCode)}</span>` : ''}${forOrder.startTime ? ` &middot; <span style="color:${INK_SOFT};">pour ${htmlEscape(String(forOrder.startTime).slice(0, 5))}</span>` : ''}
           </div>`
        : ''
    const returnLine = returnLabel
        ? `<div style="font-size:11.5px;color:${INK_MUTED};margin-top:4px;">Returns to ${returnLabel} after.</div>`
        : ''
    return `
<div style="padding:10px 0;${isLast ? '' : `border-bottom:1px solid ${BORDER};`}">
    <div style="font-size:12.5px;color:${INK};">${headline}</div>
    <div style="margin-top:3px;">${timingLine}</div>
    ${forLine}
    ${returnLine}
</div>`
}

function renderHelpCell({ direction, rows }) {
    const isIncoming = direction === 'in'
    const headerBadge = `<div style="margin:0 0 12px;">${renderBadgeHtml({
        label: isIncoming ? 'Incoming' : 'Outgoing',
        tone: isIncoming ? 'success' : 'warning'
    })}</div>`
    if (!rows || rows.length === 0) {
        return `
<td valign="top" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:10px;padding:16px 18px;width:50%;vertical-align:top;">
    ${headerBadge}
    <div style="font-size:12.5px;color:${INK_FAINT};">No cross-plant ${isIncoming ? 'arrivals' : 'departures'} scheduled.</div>
</td>`
    }
    const body = rows.map((r, idx) => renderHelpRow({ direction, isLast: idx === rows.length - 1, row: r })).join('')
    return `
<td valign="top" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:10px;padding:16px 18px;width:50%;vertical-align:top;">
    ${headerBadge}
    ${body}
</td>`
}

function renderHelpSection({ helpIn, helpOut }) {
    return `
<table role="presentation" cellspacing="14" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:14px;margin:0 -14px;">
    <tr>
        ${renderHelpCell({ direction: 'in', rows: helpIn })}
        ${renderHelpCell({ direction: 'out', rows: helpOut })}
    </tr>
</table>`
}

function renderRoster({ roster }) {
    if (!Array.isArray(roster) || roster.length === 0) {
        return `<div style="font-size:12.5px;color:${INK_SOFT};padding:16px;background:${SURFACE};border-radius:10px;border:1px solid ${BORDER};">No operator clock-ins assigned for this plant today.</div>`
    }
    const rows = roster
        .map((op, idx) => {
            const isLeaveOff = op.isLeaveOff === true
            const isLast = idx === roster.length - 1
            const baseCell = `padding:11px 12px;vertical-align:middle;${isLast ? '' : `border-bottom:1px solid ${SURFACE_ALT};`}`
            const slotChipBg = isLeaveOff ? '#e2e8f0' : NAVY
            const slotChipFg = isLeaveOff ? '#94a3b8' : '#ffffff'
            const clockInCell = isLeaveOff
                ? `<span style="color:${INK_FAINT};">—</span>`
                : op.clockIn
                  ? htmlEscape(op.clockIn)
                  : '—'
            const destinationTag = op.destinationPlant
                ? renderBadgeHtml({ label: `→ ${op.destinationPlant}`, size: 'md', tone: 'info' })
                : ''
            const flagToneName = isLeaveOff ? 'neutral' : op.isOutbound ? 'info' : 'warning'
            const flagTag = op.flag ? renderBadgeHtml({ label: op.flag, tone: flagToneName }) : ''
            const notesCell = [destinationTag, flagTag].filter(Boolean).join(' &nbsp;')
            const slotNumber = op.index ? String(op.index) : '—'
            const slotName = op.index ? `Operator ${op.index}` : '—'
            const metaLabel = ''
            return `
<tr>
    <td style="${baseCell}width:200px;">
        ${renderBadgeHtml({ bg: slotChipBg, fg: slotChipFg, label: slotNumber, marginRight: '8px', shape: 'pill', size: 'md' })}
        <span style="font-weight:600;color:${isLeaveOff ? INK_FAINT : INK};font-size:12.5px;vertical-align:middle;">${htmlEscape(slotName)}</span>${metaLabel}
    </td>
    <td style="${baseCell}font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;text-align:right;width:100px;font-weight:600;color:${isLeaveOff ? INK_FAINT : INK};">${clockInCell}</td>
    <td style="${baseCell}">${notesCell || '<span style="color:#cbd5e1;">—</span>'}</td>
</tr>`
        })
        .join('')
    const th = (label, align, width) => `
<th style="background:${NAVY};color:#ffffff;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:0.1em;text-align:${align};padding:11px 12px;${width ? `width:${width};` : ''}">${label}</th>`
    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;font-size:12.5px;border-radius:10px;overflow:hidden;border:1px solid ${BORDER};">
    <thead>
        <tr>
            ${th('Operator', 'left', '200px')}
            ${th('Clock in', 'right', '100px')}
            ${th('Notes', 'left', null)}
        </tr>
    </thead>
    <tbody>${rows}</tbody>
</table>`
}

/** "What changed since 4 PM" callout used by the 5 PM corrections email.
 *  Renders three optional sub-sections (added / removed / changed); each
 *  one is only included when its list is non-empty. The schedule table
 *  below this block always reflects the *current* state, so the callout
 *  is the manager's quick-scan summary before they re-read the full plan. */
function renderCorrectionsCallout({ corrections }) {
    if (!corrections) return ''
    const added = Array.isArray(corrections.added) ? corrections.added : []
    const removed = Array.isArray(corrections.removed) ? corrections.removed : []
    const changed = Array.isArray(corrections.changed) ? corrections.changed : []
    if (added.length === 0 && removed.length === 0 && changed.length === 0) return ''

    const sectionLabel = (label, count) => `
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${ACCENT_DARK};margin:14px 0 8px;">
            ${htmlEscape(label)} <span style="color:${INK_SOFT};font-weight:500;letter-spacing:0.02em;">(${count})</span>
        </div>`

    const orderLine = (order) => {
        const start = order?.startTime ? htmlEscape(order.startTime) : '—'
        const orderNum = order?.orderNum
            ? ` &middot; <span style="font-family:ui-monospace,Menlo,Consolas,monospace;color:${INK_MUTED};">#${htmlEscape(order.orderNum)}</span>`
            : ''
        const customer = htmlEscape(order?.customer || 'Unknown customer')
        const yards = order?.yardage
            ? ` &middot; <span style="color:${INK_MUTED};">${htmlEscape(order.yardage)} yd<sup>3</sup></span>`
            : ''
        return `
        <li style="margin:0 0 6px;padding:0;list-style:none;font-size:12.5px;color:${INK};line-height:1.5;">
            <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;font-weight:600;color:${INK};">${start}</span>${orderNum} &middot; <strong style="color:${INK};font-weight:600;">${customer}</strong>${yards}
        </li>`
    }

    const changedCard = (entry) => {
        const fields = Array.isArray(entry?.fields) ? entry.fields : []
        if (fields.length === 0) return ''
        const fieldRows = fields
            .map(
                (f) => `
            <tr>
                <td style="padding:3px 12px 3px 0;font-size:11.5px;color:${INK_SOFT};white-space:nowrap;">${htmlEscape(f.label || f.field || '')}</td>
                <td style="padding:3px 8px 3px 0;font-size:11.5px;color:${INK_MUTED};font-family:ui-monospace,Menlo,Consolas,monospace;text-decoration:line-through;text-decoration-color:#cbd5e1;">${htmlEscape(f.before || '—')}</td>
                <td style="padding:3px 8px 3px 0;font-size:11.5px;color:${INK_FAINT};white-space:nowrap;">&rarr;</td>
                <td style="padding:3px 0;font-size:11.5px;color:${INK};font-weight:600;font-family:ui-monospace,Menlo,Consolas,monospace;">${htmlEscape(f.after || '—')}</td>
            </tr>`
            )
            .join('')
        const orderNumLabel = entry?.orderNum
            ? `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:600;color:${INK};">#${htmlEscape(entry.orderNum)}</span> `
            : ''
        const startLabel = entry?.startTime
            ? ` <span style="font-family:ui-monospace,Menlo,Consolas,monospace;color:${INK_SOFT};font-size:11.5px;">@ ${htmlEscape(entry.startTime)}</span>`
            : ''
        return `
        <div style="margin:0 0 10px;padding:10px 12px;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;">
            <div style="font-size:12.5px;color:${INK};line-height:1.4;">
                ${orderNumLabel}<span style="color:${INK_MUTED};">${htmlEscape(entry?.customer || 'Unknown customer')}</span>${startLabel}
            </div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:6px;border-collapse:collapse;">
                ${fieldRows}
            </table>
        </div>`
    }

    const addedBlock = added.length
        ? `${sectionLabel('Added', added.length)}<ul style="margin:0;padding:0;list-style:none;">${added.map(orderLine).join('')}</ul>`
        : ''
    const removedBlock = removed.length
        ? `${sectionLabel('Removed', removed.length)}<ul style="margin:0;padding:0;list-style:none;">${removed.map(orderLine).join('')}</ul>`
        : ''
    const changedBlock = changed.length
        ? `${sectionLabel('Changed', changed.length)}${changed.map(changedCard).join('')}`
        : ''

    return `
<div style="margin:0 0 24px;padding:16px 20px;background:#fef2f2;border:1px solid #fecaca;border-left:4px solid ${ACCENT};border-radius:0 12px 12px 0;">
    <div style="font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT_DARK};margin-bottom:4px;">
        Updated since 4 PM
    </div>
    <div style="font-size:16px;font-weight:700;color:${INK};line-height:1.2;margin-bottom:4px;">What changed</div>
    <div style="font-size:12.5px;color:${INK_MUTED};line-height:1.5;">
        The schedule below reflects the latest dispatch data. The differences from the 4 PM plan are summarized here.
    </div>
    ${addedBlock}
    ${removedBlock}
    ${changedBlock}
</div>`
}

function renderNotes({ notes }) {
    const normalized = normalizeNotes(notes)
    if (!normalized) return ''
    const escaped = htmlEscape(normalized).replace(/\n/g, '<br/>')
    return `
${renderSectionHeader('Dispatcher notes', 'From the dispatcher')}
<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;font-size:13px;line-height:1.55;color:#78350f;border-radius:0 10px 10px 0;">
    ${escaped}
</div>`
}

function renderCorrectionsText({ corrections }) {
    if (!corrections) return []
    const added = Array.isArray(corrections.added) ? corrections.added : []
    const removed = Array.isArray(corrections.removed) ? corrections.removed : []
    const changed = Array.isArray(corrections.changed) ? corrections.changed : []
    if (added.length === 0 && removed.length === 0 && changed.length === 0) return []
    const lines = ['What changed since 4 PM:']
    const summary = (o) =>
        `  ${o.startTime || '—'}  ${o.orderNum ? '#' + o.orderNum : '—'}  ${o.customer || 'Unknown customer'}${o.yardage ? `  ${o.yardage}yd` : ''}`
    if (added.length) {
        lines.push(`  Added (${added.length}):`)
        added.forEach((o) => lines.push(summary(o)))
    }
    if (removed.length) {
        lines.push(`  Removed (${removed.length}):`)
        removed.forEach((o) => lines.push(summary(o)))
    }
    if (changed.length) {
        lines.push(`  Changed (${changed.length}):`)
        changed.forEach((c) => {
            const head = `  ${c.orderNum ? '#' + c.orderNum : '—'}  ${c.customer || 'Unknown customer'}${c.startTime ? ` @ ${c.startTime}` : ''}`
            lines.push(head)
            ;(c.fields || []).forEach((f) => {
                lines.push(`      ${f.label || f.field}: ${f.before || '—'} -> ${f.after || '—'}`)
            })
        })
    }
    lines.push('')
    return lines
}

function renderTextFallback({ plantLabel, dateLabel, kpi, orders, notes, corrections }) {
    const isCorrections = !!corrections
    const lines = [`${isCorrections ? '[UPDATED] ' : ''}Daily Plan — ${plantLabel}`, dateLabel, '']
    const correctionsLines = renderCorrectionsText({ corrections })
    if (correctionsLines.length) lines.push(...correctionsLines)
    lines.push(
        `Orders: ${kpi?.orderCount || 0} · Loads: ${kpi?.loadCount || 0} · Window: ${kpi?.firstStart || '—'}-${kpi?.lastStart || '—'}`,
        ''
    )
    if (Array.isArray(orders) && orders.length > 0) {
        lines.push('Orders:')
        orders.forEach((o) => {
            const tag = o.needsHelp ? '[NEEDS HELP] ' : ''
            const spacingPart = Number.isFinite(o.spacingMin) ? ` ${o.spacingMin}min spacing` : ''
            lines.push(
                `  ${o.startTime || '—'}  ${o.orderNum ? '#' + o.orderNum : '—'}  ${o.customer || ''}  ${o.yardage || 0}yd ${o.truckCount || 0} trucks${spacingPart}  ${tag}`.trimEnd()
            )
        })
        lines.push('')
    }
    const normalizedNotes = normalizeNotes(notes)
    if (normalizedNotes) {
        lines.push('Notes:')
        lines.push(normalizedNotes)
    }
    return lines.join('\n')
}

/** Public builder: data → `{ subject, html, text }`. Pure function — every
 *  caller (the Review modal preview, the edge function send, the cron job)
 *  produces the exact same bytes for the same input. */
export function buildDailyPlanEmail({
    plant = { code: '', name: '' },
    planDate = '',
    kpi = {},
    orders = [],
    helpIn = [],
    helpOut = [],
    roster = [],
    notes = '',
    corrections = null,
    intendedTo = [],
    intendedCc = [],
    testMode = false,
    testRedirectEmail = '',
    frontendUrl = 'https://smyrnatools.com'
}) {
    const dateLong = formatLongDate(planDate)
    const dateShort = formatShortDate(planDate)
    const plantLabel = `Plant ${plant.code}${plant.name ? ` ${plant.name}` : ''}`
    const greetingName = (intendedTo[0]?.name || '').split(' ')[0]
    const greetingLine = greetingName ? `Hello ${htmlEscape(greetingName)},` : 'Hello,'
    const isCorrections =
        !!corrections &&
        ((Array.isArray(corrections.added) && corrections.added.length > 0) ||
            (Array.isArray(corrections.removed) && corrections.removed.length > 0) ||
            (Array.isArray(corrections.changed) && corrections.changed.length > 0))

    const subjectCore = `${plantLabel} — Daily Plan for ${dateShort}`
    const subjectWithUpdate = isCorrections ? `[UPDATED] ${subjectCore}` : subjectCore
    const subject = testMode ? `[TEST] ${subjectWithUpdate}` : subjectWithUpdate

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${htmlEscape(subjectCore)}</title>
</head>
<body style="margin:0;padding:32px 16px;background:#eef0f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:760px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 12px 32px rgba(15,23,42,0.08);">
    <tr>
        <td style="background:linear-gradient(135deg,${ACCENT} 0%,${ACCENT_DARK} 100%);background-color:${ACCENT};color:#ffffff;padding:24px 32px 22px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
                <tr>
                    <td valign="middle">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;opacity:0.85;">Smyrna Ready Mix</div>
                        <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;margin-top:6px;line-height:1.1;">Daily Dispatch Plan</div>
                    </td>
                    <td valign="middle" align="right" style="font-size:13px;line-height:1.45;text-align:right;">
                        <div style="font-weight:600;">${htmlEscape(dateLong)}</div>
                        <div style="font-size:12px;opacity:0.85;margin-top:3px;">${htmlEscape(plantLabel)}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="background:${NAVY};color:#ffffff;padding:10px 32px;font-size:11.5px;letter-spacing:0.04em;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
                <tr>
                    <td valign="middle" style="opacity:0.85;">
                        <strong style="text-transform:uppercase;letter-spacing:0.12em;font-size:10.5px;">Heads up</strong>
                        &nbsp;&middot;&nbsp; ${
                            isCorrections
                                ? 'This is an updated version of today&rsquo;s 4:00 PM plan. See <em>What changed</em> below.'
                                : 'Plans may be updated through 5:00 PM. You are responsible for reading any updates that come in &mdash; including after you have clocked out for the day.'
                        }
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    ${testMode ? renderTestBanner({ intendedCc, intendedTo, plantLabel, testRedirectEmail }) : ''}
    <tr>
        <td style="padding:28px 32px 32px;">
            <p style="font-size:16px;margin:0 0 6px;color:${INK};font-weight:600;">${greetingLine}</p>
            <p style="font-size:13.5px;color:${INK_MUTED};margin:0 0 24px;line-height:1.55;">
                ${
                    isCorrections
                        ? `This is an <strong style="color:${ACCENT_DARK};">updated</strong> dispatch plan for <strong style="color:${INK};">${htmlEscape(plantLabel)}</strong> on <strong style="color:${INK};">${htmlEscape(dateLong)}</strong>. The schedule shifted after the 4:00 PM send &mdash; review the highlighted changes below, then skim the updated plan.`
                        : `Below is the dispatch plan for <strong style="color:${INK};">${htmlEscape(plantLabel)}</strong> on <strong style="color:${INK};">${htmlEscape(dateLong)}</strong>. The plan was auto-generated from the day&rsquo;s saved schedule &mdash; skim the highlights, scan for risk, and reach back to dispatch if anything looks off.`
                }
            </p>
            ${isCorrections ? renderCorrectionsCallout({ corrections }) : ''}
            ${renderSummaryGrid({ kpi })}
            ${renderSectionHeader(isCorrections ? 'Updated schedule' : 'Orders for today', isCorrections ? 'Current state after 5:00 PM' : 'What you are pouring')}
            ${renderOrdersTable({ orders })}
            ${renderSectionHeader('Cross-plant help', 'Who is coming, who is going')}
            ${renderHelpSection({ helpIn, helpOut })}
            ${renderSectionHeader('Operator clock-in roster', 'How the day starts')}
            ${renderRoster({ roster })}
            ${renderNotes({ notes })}
        </td>
    </tr>
    <tr>
        <td style="background:${NAVY_DARK};color:#cbd5e1;padding:22px 32px;font-size:11.5px;line-height:1.6;text-align:center;">
            <div style="font-weight:700;color:#ffffff;letter-spacing:0.04em;">Smyrna Ready Mix &middot; Plan Tools</div>
            <div style="margin-top:4px;opacity:0.75;">Auto-generated for ${htmlEscape(dateLong)}</div>
            <div style="margin-top:10px;">
                <a href="${htmlEscape(frontendUrl)}" style="display:inline-block;padding:9px 18px;background:#ffffff;color:${NAVY};border-radius:999px;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:0.04em;">View the live plan &rarr;</a>
            </div>
            ${testMode ? `<div style="margin-top:14px;font-size:10.5px;color:#94a3b8;">Test message — production messages omit the redirect banner above and route to the intended TO + CC.</div>` : ''}
        </td>
    </tr>
</table>
</body>
</html>`

    const text = renderTextFallback({ corrections, dateLabel: dateLong, kpi, notes, orders, plantLabel })

    return { html, subject, text }
}

export default buildDailyPlanEmail
