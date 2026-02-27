import { UserService } from '../../../../../services/UserService'
import {
    addDataRow,
    addReportHeader,
    addSectionTitle,
    addTableHeaders,
    COLORS
} from '../../../../../utils/ExportUtility'
import { createSheet, exportWorkbook, finalizeSheet, initExport } from '../ExportModule'

const SEVERITY_COLORS = {
    High: COLORS.danger,
    Low: COLORS.success,
    Medium: COLORS.accent
}

const MAX_COLUMN_COUNT = 10

function groupAssetsByPlant(assets, plants, identifierField) {
    const plantNameMap = {}
    plants.forEach((p) => {
        const code = p.plantCode || p.plant_code || ''
        plantNameMap[code] = p.plantName || p.plant_name || code
    })

    const groups = {}
    assets.forEach((asset) => {
        const code = asset.assignedPlant || asset.assigned_plant || 'Unassigned'
        if (!groups[code]) groups[code] = { assets: [], name: plantNameMap[code] || code }
        groups[code].assets.push(asset)
    })

    return Object.entries(groups)
        .sort(([a], [b]) => {
            if (a === 'Unassigned') return 1
            if (b === 'Unassigned') return -1
            const numA = parseInt(a.replace(/\D/g, '') || '999')
            const numB = parseInt(b.replace(/\D/g, '') || '999')
            return numA - numB
        })
        .map(([code, group]) => ({ assets: group.assets, code, name: group.name }))
}

function formatIssueDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date)) return ''
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function resolveUserNames(issues) {
    const userIds = new Set()
    issues.forEach((issue) => {
        if (issue.created_by) userIds.add(issue.created_by)
    })

    const names = {}
    for (const userId of userIds) {
        try {
            names[userId] = (await UserService.getUserDisplayName(userId)) || 'Unknown'
        } catch {
            names[userId] = 'Unknown'
        }
    }
    return names
}

export async function exportAssetIssuesSheet({ assets, plants, assetType, identifierField, service }) {
    if (!assets?.length) return

    const assetsWithIssues = assets.filter((a) => (a.openIssuesCount ?? 0) > 0 && a.status !== 'Retired')
    if (assetsWithIssues.length === 0) return

    const allIssues = []
    const issuesByAssetId = {}

    await Promise.all(
        assetsWithIssues.map(async (asset) => {
            try {
                const issues = await service.fetchIssues(asset.id)
                const openIssues = (issues ?? []).filter((i) => !i.time_completed)
                issuesByAssetId[asset.id] = openIssues
                allIssues.push(...openIssues)
            } catch {
                issuesByAssetId[asset.id] = []
            }
        })
    )

    const userNames = await resolveUserNames(allIssues)

    const sheetTitle = `${assetType} Issues Report`
    const { wb, logoBase64 } = await initExport({ subject: sheetTitle })
    const ws = createSheet(wb, `${assetType} Issues`, {
        columns: [
            { width: 3 },
            { width: 6 },
            { width: 18 },
            { width: 36 },
            { width: 12 },
            { width: 14 },
            { width: 16 },
            { width: 14 },
            { width: 14 },
            { width: 14 }
        ]
    })

    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    let r = addReportHeader(ws, wb, { logoBase64, subtitle: dateStr, title: sheetTitle })
    r++

    const totalOpenIssues = Object.values(issuesByAssetId).reduce((sum, issues) => sum + issues.length, 0)

    addSectionTitle(
        ws,
        r,
        `Summary  |  ${assetsWithIssues.length} ${assetType}s with Issues  |  ${totalOpenIssues} Open Issues`
    )
    r += 2

    const plantGroups = groupAssetsByPlant(assetsWithIssues, plants)

    for (const group of plantGroups) {
        ws.mergeCells(r, 2, r, MAX_COLUMN_COUNT)
        const plantCell = ws.getCell(r, 2)
        plantCell.value = `${group.name} (${group.code})`
        plantCell.font = { bold: true, color: { argb: COLORS.white }, name: 'Calibri', size: 12 }
        plantCell.fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
        plantCell.alignment = { horizontal: 'left', vertical: 'middle' }
        for (let c = 3; c <= MAX_COLUMN_COUNT; c++) {
            ws.getCell(r, c).fill = { fgColor: { argb: COLORS.brand }, pattern: 'solid', type: 'pattern' }
        }
        ws.getRow(r).height = 26
        r++

        addTableHeaders(ws, r, ['#', assetType, 'Issue Description', 'Severity', 'Created', 'Reported By', 'Status'], 2)
        r++

        let rowIndex = 1
        const sortedAssets = [...group.assets].sort(
            (a, b) => (issuesByAssetId[b.id]?.length ?? 0) - (issuesByAssetId[a.id]?.length ?? 0)
        )

        for (const asset of sortedAssets) {
            const assetIdentifier = asset[identifierField] || asset.identifyingNumber || asset.vin || 'Unknown'
            const issues = issuesByAssetId[asset.id] ?? []
            const sortedIssues = [...issues].sort((a, b) => new Date(b.time_created) - new Date(a.time_created))

            for (const issue of sortedIssues) {
                const isAlt = rowIndex % 2 === 0
                const severityValue = issue.severity || 'Medium'
                const description = issue.issue || issue.description || issue.details || issue.notes || 'No description'
                const createdBy = issue.created_by ? userNames[issue.created_by] || 'Unknown' : 'Unknown'

                addDataRow(
                    ws,
                    r,
                    [
                        { align: 'center', value: rowIndex },
                        { align: 'left', bold: true, value: assetIdentifier },
                        description,
                        {
                            align: 'center',
                            bold: true,
                            color: SEVERITY_COLORS[severityValue] || COLORS.accent,
                            value: severityValue
                        },
                        { align: 'center', value: formatIssueDate(issue.time_created) },
                        { align: 'left', value: createdBy },
                        { align: 'center', color: COLORS.danger, value: 'Open' }
                    ],
                    2,
                    isAlt
                )
                r++
                rowIndex++
            }
        }

        r++
    }

    r++
    ws.mergeCells(r, 2, r, MAX_COLUMN_COUNT)
    const footerCell = ws.getCell(r, 2)
    footerCell.value = `Generated by Smyrna Tools on ${dateStr}`
    footerCell.font = { color: { argb: COLORS.slate500 }, italic: true, name: 'Calibri', size: 9 }
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' }

    finalizeSheet(ws, { maxCol: MAX_COLUMN_COUNT + 2, maxRow: r + 5 })
    await exportWorkbook(wb, `${assetType} Issues Report ${new Date().toISOString().slice(0, 10)}.xlsx`)
}
