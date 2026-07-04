/**
 * Standalone preview generator for the daily-plan email. Writes a sample
 * render to `build/email-previews/daily-plan-email.html` so you can open
 * it in Safari / any browser and review the design without spinning up
 * the edge function. Run with:
 *
 *   node scripts/emails/preview-daily-plan-email.mjs
 *
 * The sample data is meant to exercise every section: a busy plant
 * (404 Wylie) with a mix of covered + needs-help orders, both inbound
 * and outbound cross-plant help, a roster with a leave-off row, and a
 * dispatcher note. Two preview files are written — one in production
 * mode and one in test mode — so the test banner can be visually
 * inspected.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildDailyPlanEmail } from './daily-plan-email.js'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../../build/email-previews')
mkdirSync(outDir, { recursive: true })

const sampleData = {
    frontendUrl: 'https://smyrnatools.com',
    helpIn: [
        {
            arriveTime: '06:45',
            counterPlantCode: '601',
            counterPlantName: 'Bonham',
            driverLabel: 'Truck 142 · Hernandez',
            forOrder: {
                customer: 'CMC Concrete Construction',
                orderNum: '218842',
                productCode: '4500 PSI',
                startTime: '07:00'
            },
            leaveTime: '10:30',
            returnPlantCode: '601',
            returnPlantName: 'Bonham'
        },
        {
            arriveTime: '08:00',
            counterPlantCode: '265',
            counterPlantName: 'McKinney',
            driverLabel: 'Truck 218 · Rodriguez',
            forOrder: {
                customer: 'Stonebridge Builders',
                orderNum: '218867',
                productCode: '3000 PSI',
                startTime: '08:30'
            },
            leaveTime: '11:15',
            returnPlantCode: '404'
        }
    ],
    helpOut: [
        {
            arriveTime: '13:30',
            counterPlantCode: '956',
            counterPlantName: 'Frisco',
            driverLabel: 'Truck 308 · Patel',
            forOrder: {
                customer: 'Bridgepoint Apartments',
                orderNum: '218903',
                productCode: '5000 PSI',
                startTime: '14:00'
            },
            leaveTime: '16:45',
            returnPlantCode: '404'
        }
    ],
    intendedCc: [{ email: 'dgarza@smyrnareadymix.com', name: 'Daniel Garza' }],
    intendedTo: [{ email: 'cleland@smyrnareadymix.com', name: 'Cameron Leland' }],
    kpi: {
        customerCount: 11,
        firstStart: '06:00',
        lastStart: '16:30',
        loadCount: 38,
        orderCount: 14,
        yardage: 367
    },
    notes:
        'two of the early CMC pours need to overlap so the 5500 PSI batches do not back up. confirm with josh before 7\nflag any spacing tighter than 35 minutes — call dispatch if a pump shows up unscheduled',
    orders: [
        {
            address: '8104 Stonebrook Pkwy, Frisco',
            customer: 'CMC Concrete Construction',
            needsHelp: false,
            orderNum: '218842',
            productCode: '4500 PSI',
            spacingMin: 30,
            startTime: '07:00',
            truckCount: 4,
            yardage: 60
        },
        {
            address: '2400 Stonebridge Ranch Rd, McKinney',
            customer: 'Stonebridge Builders',
            needsHelp: true,
            orderNum: '218867',
            productCode: '3000 PSI',
            spacingMin: 22,
            startTime: '08:30',
            truckCount: 6,
            yardage: 92
        },
        {
            address: '11104 Lebanon Rd, Frisco',
            customer: 'Highland Homes',
            needsHelp: false,
            orderNum: '218871',
            productCode: '3000 PSI',
            spacingMin: 40,
            startTime: '09:15',
            truckCount: 2,
            yardage: 24
        },
        {
            address: 'Memorial & Coit, McKinney',
            customer: 'Manhattan Construction',
            needsHelp: false,
            orderNum: '218883',
            productCode: 'Flowable Fill',
            spacingMin: 45,
            startTime: '10:00',
            truckCount: 3,
            yardage: 36
        },
        {
            address: '6701 Eldorado Pkwy, McKinney',
            customer: 'Lennar Homes',
            needsHelp: true,
            orderNum: '218888',
            productCode: '4000 PSI',
            spacingMin: 25,
            startTime: '11:00',
            truckCount: 5,
            yardage: 70
        },
        {
            address: '1900 Preston Rd, Frisco',
            customer: 'Bridgepoint Apartments',
            needsHelp: false,
            orderNum: '218903',
            productCode: '5000 PSI',
            spacingMin: 35,
            startTime: '14:00',
            truckCount: 4,
            yardage: 56
        },
        {
            address: '4500 Coit Rd, Plano',
            customer: 'Texas Driveways',
            needsHelp: false,
            orderNum: '218914',
            productCode: '3500 PSI',
            spacingMin: 40,
            startTime: '15:15',
            truckCount: 2,
            yardage: 18
        },
        {
            address: '7200 Independence Pkwy, Plano',
            customer: 'KB Foundation Crew',
            needsHelp: false,
            orderNum: '218921',
            productCode: '3000 PSI',
            spacingMin: 40,
            startTime: '16:30',
            truckCount: 1,
            yardage: 11
        }
    ],
    plant: { code: '404', name: 'Wylie' },
    planDate: '2026-05-25',
    roster: [
        { clockIn: '05:30', index: 1, name: 'Slot 1' },
        { clockIn: '05:45', flag: 'Outbound', index: 2, destinationPlant: '956', isOutbound: true, name: 'Slot 2' },
        { clockIn: '06:00', index: 3, name: 'Slot 3' },
        { clockIn: '06:15', index: 4, name: 'Slot 4' },
        { clockIn: '06:30', index: 5, name: 'Slot 5' },
        { clockIn: '06:45', flag: 'Standby', index: 6, name: 'Slot 6' },
        { index: 7, isLeaveOff: true, flag: 'Leave off', name: 'Slot 7' }
    ]
}

const productionRun = buildDailyPlanEmail({ ...sampleData, testMode: false })
const testRun = buildDailyPlanEmail({
    ...sampleData,
    testMode: true,
    testRedirectEmail: 'tbtaylor@smyrnareadymix.com'
})

writeFileSync(resolve(outDir, 'daily-plan-email.html'), productionRun.html)
writeFileSync(resolve(outDir, 'daily-plan-email-test-mode.html'), testRun.html)

const indexHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Daily Plan email — previews</title>
<style>
:root { color-scheme: light; }
body { margin:0; padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#eef0f4; color:#0f172a; }
header { max-width:760px; margin:0 auto 18px; }
h1 { font-size:18px; margin:0 0 4px; }
p { margin:0; font-size:13px; color:#475569; }
nav { max-width:760px; margin:0 auto 18px; display:flex; gap:8px; }
nav a { display:inline-block; padding:8px 14px; border-radius:999px; background:#1e3a5f; color:#fff; text-decoration:none; font-weight:600; font-size:12.5px; letter-spacing:0.02em; }
nav a.test { background:#f59e0b; color:#1f1300; }
iframe { display:block; width:100%; max-width:760px; height:1500px; margin:0 auto 24px; border:1px solid #e2e8f0; border-radius:16px; background:#fff; box-shadow:0 1px 3px rgba(15,23,42,0.06),0 12px 32px rgba(15,23,42,0.08); }
section { max-width:760px; margin:0 auto; }
.label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#64748b; margin:0 auto 8px; max-width:760px; }
</style>
</head>
<body>
<header>
<h1>Daily Plan email — design preview</h1>
<p>Sample render for Plant 404 (Wylie) on Monday, May 25, 2026.</p>
</header>
<nav>
<a href="daily-plan-email.html">Production render</a>
<a class="test" href="daily-plan-email-test-mode.html">Test-mode render</a>
</nav>
<div class="label">Production version (no redirect banner)</div>
<iframe src="daily-plan-email.html" title="Production preview"></iframe>
<div class="label">Test-mode version (yellow redirect banner at top)</div>
<iframe src="daily-plan-email-test-mode.html" title="Test-mode preview"></iframe>
</body>
</html>`

writeFileSync(resolve(outDir, 'index.html'), indexHtml)

console.log('Preview written to:')
console.log(`  ${resolve(outDir, 'index.html')}`)
console.log(`  ${resolve(outDir, 'daily-plan-email.html')}`)
console.log(`  ${resolve(outDir, 'daily-plan-email-test-mode.html')}`)
