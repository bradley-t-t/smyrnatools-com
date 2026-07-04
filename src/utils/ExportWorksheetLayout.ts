import { COLORS, SITE_URL } from './ExportConstants'
import {
    alignMiddle,
    applyHeaderStyle,
    BRAND_UNDERLINE_BORDER,
    buildFont,
    DATA_FONT,
    HEADER_FILL,
    HEADER_BORDER,
    resolveChangeBgColor,
    solidFill,
    TOTAL_BORDER
} from './ExportExcelStyles'
import { getChangeText, getChangeValue } from './ExportValueHelpers'

/**
 * Worksheet layout builders — section titles, table headers (flat and
 * merged), data rows, total/change cells, the report-header band with logo
 * and subtitle, and the multi-group overview section used in the GM report.
 * All builders accept a worksheet + row index and return either nothing or
 * the next available row so callers can chain them top-to-bottom.
 */

export function addSectionTitle(worksheet, row, text) {
    worksheet.mergeCells(row, 2, row, 12)
    const cell = worksheet.getCell(row, 2)
    cell.value = text
    cell.font = buildFont(14, COLORS.brand, { bold: true })
    cell.alignment = alignMiddle('left')
    for (let col = 2; col <= 16; col++) {
        worksheet.getCell(row, col).border = BRAND_UNDERLINE_BORDER
    }
    worksheet.getRow(row).height = 28
}

export function addTableHeaders(worksheet, row, headers, startCol = 2) {
    headers.forEach((header, idx) => applyHeaderStyle(worksheet.getCell(row, startCol + idx), header))
    worksheet.getRow(row).height = 22
}

export function addMergedTableHeaders(worksheet, row, headers, startCol = 2) {
    let col = startCol
    headers.forEach((header) => {
        const mergeCount = header.mergeCount || (header.merge ? 2 : 1)
        const alignment = header.align || 'center'
        if (mergeCount > 1) worksheet.mergeCells(row, col, row, col + mergeCount - 1)
        applyHeaderStyle(worksheet.getCell(row, col), header.label, alignment)
        for (let offset = 1; offset < mergeCount; offset++) {
            const mergedCell = worksheet.getCell(row, col + offset)
            mergedCell.fill = HEADER_FILL
            mergedCell.border = HEADER_BORDER
        }
        col += mergeCount
    })
    worksheet.getRow(row).height = 22
}

export function addChangePct(cell, changeInfo, isAlt = false) {
    if (!changeInfo?.text) {
        cell.value = ''
        if (isAlt) cell.fill = solidFill(COLORS.snow)
    } else {
        cell.value = changeInfo.text.trim()
        cell.font = buildFont(8, changeInfo.color, { bold: true })
        const bgColor = resolveChangeBgColor(changeInfo.color, isAlt)
        if (bgColor) cell.fill = solidFill(bgColor)
    }
    cell.alignment = alignMiddle('right')
}

export function addDataRow(worksheet, row, values, startCol = 2, isAlt = false) {
    values.forEach((value, idx) => {
        const cell = worksheet.getCell(row, startCol + idx)
        if (typeof value === 'object' && value !== null) {
            cell.value = value.richText ? { richText: value.richText } : value.value
            if (value.format) cell.numFmt = value.format
            cell.alignment = alignMiddle(value.align || 'left')
            cell.font = value.color
                ? buildFont(11, value.color, { bold: value.bold })
                : value.richText
                  ? undefined
                  : DATA_FONT
        } else {
            cell.value = value
            cell.font = DATA_FONT
            cell.alignment = alignMiddle(typeof value === 'number' ? 'right' : 'left')
        }
        if (isAlt) cell.fill = solidFill(COLORS.snow)
    })
    worksheet.getRow(row).height = 20
}

export function applySubtleBackground(worksheet, maxRow = 200, maxCol = 30) {
    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
        const row = worksheet.getRow(rowNum)
        for (let colNum = 1; colNum <= maxCol; colNum++) {
            const cell = row.getCell(colNum)
            if (!cell.fill?.fgColor || cell.fill.fgColor.argb === COLORS.white) {
                cell.fill = solidFill(COLORS.subtleGray)
            }
        }
    }
}

export function applyTotalCell(cell, value, format) {
    cell.value = value
    if (format) cell.numFmt = format
    cell.font = buildFont(11, COLORS.brand, { bold: true })
    cell.fill = HEADER_FILL
    cell.border = TOTAL_BORDER
    cell.alignment = alignMiddle('left')
}

export function applyTotalChangeCell(cell, changeInfo) {
    cell.value = changeInfo?.text?.trim() || ''
    if (changeInfo?.text) {
        cell.font = buildFont(9, changeInfo.color, { bold: true })
    }
    cell.fill = HEADER_FILL
    cell.border = TOTAL_BORDER
    cell.alignment = alignMiddle('right')
}

export function addReportHeader(worksheet, workbook, { logoBase64, title, subtitle, row = 2 }) {
    let currentRow = row
    if (logoBase64) {
        worksheet.mergeCells(currentRow, 2, currentRow + 2, 3)
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' })
        worksheet.addImage(imageId, {
            br: { col: 3, row: currentRow + 2 },
            editAs: 'oneCell',
            tl: { col: 1, row: currentRow - 1 }
        })
    }
    worksheet.mergeCells(currentRow, 5, currentRow, 12)
    const titleCell = worksheet.getCell(currentRow, 5)
    titleCell.value = title
    titleCell.font = buildFont(26, COLORS.brand, { bold: true })
    titleCell.alignment = alignMiddle('left')
    worksheet.getRow(currentRow).height = 36
    currentRow++
    if (subtitle) {
        worksheet.mergeCells(currentRow, 5, currentRow, 9)
        const subtitleCell = worksheet.getCell(currentRow, 5)
        subtitleCell.value = subtitle
        subtitleCell.font = buildFont(13, COLORS.slate700)
        subtitleCell.alignment = alignMiddle('left')
        currentRow++
    }
    worksheet.mergeCells(currentRow, 5, currentRow, 12)
    const dateCell = worksheet.getCell(currentRow, 5)
    const generatedDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    dateCell.value = { hyperlink: SITE_URL, text: `Generated on ${generatedDate} on smyrnatools.com` }
    dateCell.font = buildFont(10, COLORS.slate500, { italic: true, underline: true })
    currentRow += 2
    return currentRow
}

/**
 * Render a single metric row inside an overview section.
 * Extracted from addOverviewSection to keep the group loop readable.
 */
function renderOverviewMetric(
    worksheet,
    row,
    col,
    metric,
    isAlt,
    resolvedGetChangeText,
    resolvedGetChangeValue,
    resolvedAddChangePct
) {
    const bgColor = isAlt ? COLORS.snow : null

    const labelCell = worksheet.getCell(row, col)
    labelCell.value = metric.label
    labelCell.font = buildFont(10, COLORS.slate500)
    labelCell.alignment = alignMiddle('left')
    if (bgColor) labelCell.fill = solidFill(bgColor)

    const changeInfo =
        metric.prev !== undefined
            ? metric.useValue
                ? resolvedGetChangeValue(metric.value, metric.prev, metric.invertChange || false)
                : resolvedGetChangeText(metric.value, metric.prev, metric.invertChange || false)
            : { color: null, text: '' }
    const changeCell = worksheet.getCell(row, col + 1)
    resolvedAddChangePct(changeCell, changeInfo, isAlt)
    if (bgColor && !changeInfo?.text) changeCell.fill = solidFill(bgColor)

    const valueCell = worksheet.getCell(row, col + 2)
    valueCell.value = metric.suffix ? metric.value + metric.suffix : metric.value
    if (!metric.suffix && metric.format) valueCell.numFmt = metric.format
    valueCell.font = buildFont(12, metric.color || COLORS.brand, { bold: true })
    valueCell.alignment = alignMiddle('left')
    if (bgColor) valueCell.fill = solidFill(bgColor)

    worksheet.getRow(row).height = 20
}

export function addOverviewSection(
    worksheet,
    {
        startRow,
        startCol,
        title,
        groups,
        getChangeText: getChangeTextFn,
        getChangeValue: getChangeValueFn,
        addChangePct: addChangePctFn
    }
) {
    const col = startCol
    let row = startRow
    worksheet.getColumn(col).width = 14
    worksheet.getColumn(col + 1).width = 8
    worksheet.getColumn(col + 2).width = 10

    // Section title banner
    worksheet.mergeCells(row, col, row, col + 2)
    const titleCell = worksheet.getCell(row, col)
    titleCell.value = title
    titleCell.font = buildFont(16, COLORS.white, { bold: true })
    titleCell.fill = solidFill(COLORS.brand)
    titleCell.alignment = alignMiddle('center')
    worksheet.getCell(row, col + 1).fill = solidFill(COLORS.brand)
    worksheet.getCell(row, col + 2).fill = solidFill(COLORS.brand)
    worksheet.getRow(row).height = 28
    row += 2

    const resolvedGetChangeText = getChangeTextFn || getChangeText
    const resolvedGetChangeValue = getChangeValueFn || getChangeValue
    const resolvedAddChangePct = addChangePctFn || addChangePct

    groups.forEach((group) => {
        // Group header
        worksheet.mergeCells(row, col, row, col + 2)
        const groupCell = worksheet.getCell(row, col)
        groupCell.value = group.title
        groupCell.font = buildFont(11, COLORS.slate700, { bold: true })
        groupCell.fill = HEADER_FILL
        groupCell.alignment = alignMiddle('left')
        worksheet.getCell(row, col + 1).fill = HEADER_FILL
        worksheet.getCell(row, col + 2).fill = HEADER_FILL
        worksheet.getRow(row).height = 20
        row++

        group.metrics.forEach((metric, idx) => {
            renderOverviewMetric(
                worksheet,
                row,
                col,
                metric,
                idx % 2 === 1,
                resolvedGetChangeText,
                resolvedGetChangeValue,
                resolvedAddChangePct
            )
            row++
        })
        row++
    })
    return row
}
