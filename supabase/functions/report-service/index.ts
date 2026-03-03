// @ts-ignore
import {createClient} from "npm:@supabase/supabase-js@2.45.4";
// @ts-ignore
import {getCorsHeaders, handleOptions, jsonResponse, errorResponse} from "../_shared/cors.ts";

const YPH_THRESHOLDS = [{min: 6, grade: "excellent"}, {min: 4, grade: "good"}, {min: 3, grade: "average"}] as const;
const LOST_THRESHOLDS = [{max: 0, grade: "excellent"}, {max: 5, grade: "good"}, {max: 10, grade: "average"}] as const;
const GRADE_LABELS: Record<string, string> = {excellent: "Excellent", good: "Good", average: "Average", poor: "Poor"};
const LOST_FIELDS = ["total_yards_lost", "yardage_lost", "lost_yardage", "Yardage Lost"] as const;

function toISO(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDateMMDDYY(date: Date): string {
    return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear().toString().slice(-2)}`;
}

function parseTimeToMinutes(timeStr: unknown): number | null {
    if (!timeStr || typeof timeStr !== "string") return null;
    const [h, m] = timeStr.split(":").map(Number);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
}

function csvEscape(val: unknown): string {
    return '"' + String(val ?? "").replace(/"/g, '""') + '"';
}

async function parseBody(req: Request): Promise<any> {
    try { return await req.json(); } catch { return {}; }
}

function gradeYPH(yph: number): string {
    for (const t of YPH_THRESHOLDS) if (yph >= t.min) return t.grade;
    return "poor";
}

function gradeLost(lost: number): string {
    for (const t of LOST_THRESHOLDS) if (lost <= t.max) return t.grade;
    return "poor";
}

function extractLostYardage(form: any): number | null {
    for (const key of LOST_FIELDS) {
        const val = form?.[key];
        if (val !== undefined && val !== "" && !isNaN(Number(val))) return Math.max(0, Number(val));
    }
    return null;
}

Deno.serve(async (req) => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return handleOptions(origin);
    const headers = getCorsHeaders(origin);
    try {
        const url = new URL(req.url);
        const endpoint = url.pathname.split("/").pop();

        switch (endpoint) {
            case "user-past-due-reports": {
                const body = await parseBody(req);
                const userId = typeof body?.userId === "string" ? body.userId : null;
                if (!userId) return errorResponse("userId is required", headers, 400);
                const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const beforeIso = typeof body?.beforeDate === "string" ? new Date(body.beforeDate).toISOString() : today.toISOString();
                const {data, error} = await supabase.from("reports")
                    .select("id, report_name, user_id, report_date_range_end, completed, week")
                    .eq("user_id", userId).eq("completed", false).lt("report_date_range_end", beforeIso)
                    .order("report_date_range_end", {ascending: true});
                if (error) return errorResponse(error.message, headers, 500);
                return jsonResponse({data: Array.isArray(data) ? data : []}, headers);
            }
            case "compute-yardage-metrics": {
                const body = await parseBody(req);
                const form = body?.form ?? body;
                const yards = parseFloat(form?.total_yards_delivered ?? form?.Yardage ?? form?.yardage ?? "");
                const hours = parseFloat(form?.total_operator_hours ?? form?.["Total Hours"] ?? form?.total_hours ?? "");
                const yph = (!isNaN(yards) && !isNaN(hours) && hours > 0) ? yards / hours : null;
                const yphGrade = yph !== null ? gradeYPH(yph) : "";
                const lost = extractLostYardage(form);
                const lostGrade = lost !== null ? gradeLost(lost) : "";
                return jsonResponse({data: {yph, yphGrade, yphLabel: GRADE_LABELS[yphGrade] ?? "", lost, lostGrade, lostLabel: GRADE_LABELS[lostGrade] ?? ""}}, headers);
            }
            case "plant-production-insights": {
                const body = await parseBody(req);
                const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
                const isExcluded = (row: any) => !row || Object.keys(row).filter(k => k !== "name" && k !== "truck_number").every(k => !row[k] && row[k] !== 0 || row[k] === 0);
                let totalLoads = 0, totalHours = 0, totalElapsedStart = 0, totalElapsedEnd = 0, countElapsedStart = 0, countElapsedEnd = 0;
                let loadsPerHourSum = 0, loadsPerHourCount = 0;
                const warnings: Array<{ row: number; message: string }> = [];
                const includedRows = rows.filter(row => !isExcluded(row));
                includedRows.forEach(row => {
                    const start = parseTimeToMinutes(row.start_time);
                    const firstLoad = parseTimeToMinutes(row.first_load);
                    const punchOut = parseTimeToMinutes(row.punch_out);
                    const eod = parseTimeToMinutes(row.eod_in_yard);
                    const loads = Number(row.loads);
                    let hrs: number | null = null;
                    if (start !== null && punchOut !== null) { hrs = (punchOut - start) / 60; if (hrs > 0) totalHours += hrs; }
                    if (!isNaN(loads)) totalLoads += loads;
                    if (start !== null && firstLoad !== null) {
                        const elapsed = firstLoad - start;
                        if (!isNaN(elapsed)) { totalElapsedStart += elapsed; countElapsedStart++; if (elapsed > 15) warnings.push({row: rows.indexOf(row), message: `Start to 1st Load is ${elapsed} min (> 15 min)`}); }
                    }
                    if (eod !== null && punchOut !== null) {
                        const elapsed = punchOut - eod;
                        if (!isNaN(elapsed)) { totalElapsedEnd += elapsed; countElapsedEnd++; if (elapsed > 15) warnings.push({row: rows.indexOf(row), message: `EOD to Punch Out is ${elapsed} min (> 15 min)`}); }
                    }
                    if (!isNaN(loads) && hrs && hrs > 0) { loadsPerHourSum += loads / hrs; loadsPerHourCount++; }
                    if (!isNaN(loads) && loads < 3) warnings.push({row: rows.indexOf(row), message: `Total Loads is ${loads} (< 3)`});
                    if (hrs !== null && hrs > 14) warnings.push({row: rows.indexOf(row), message: `Total Hours is ${hrs.toFixed(2)} (> 14 hours)`});
                });
                const cnt = includedRows.length;
                const avgElapsedStart = countElapsedStart ? totalElapsedStart / countElapsedStart : null;
                const avgElapsedEnd = countElapsedEnd ? totalElapsedEnd / countElapsedEnd : null;
                const avgLoads = cnt ? totalLoads / cnt : null;
                const avgHours = cnt ? totalHours / cnt : null;
                const avgLoadsPerHour = loadsPerHourCount ? loadsPerHourSum / loadsPerHourCount : null;
                const avgWarnings: string[] = [];
                if (avgElapsedStart !== null && avgElapsedStart < 0) avgWarnings.push("Reported Start and 1st Load times produce a negative elapsed duration (likely an AM/PM entry error). Please review and correct the time entries.");
                if (avgElapsedEnd !== null && avgElapsedEnd < 0) avgWarnings.push("Reported Washout -> Punch Out times produce a negative elapsed duration (likely an AM/PM entry error). Please review and correct the time entries.");
                if (avgElapsedStart !== null && avgElapsedStart > 15) avgWarnings.push(`Avg Punch In to 1st Load is ${avgElapsedStart.toFixed(1)} min (> 15 min)`);
                if (avgElapsedEnd !== null && avgElapsedEnd > 15) avgWarnings.push(`Washout to Punch Out is ${avgElapsedEnd.toFixed(1)} min (> 15 min)`);
                if (avgLoads !== null && avgLoads < 3) avgWarnings.push(`Avg Total Loads is ${avgLoads.toFixed(2)} (< 3)`);
                if (avgHours !== null && avgHours > 14) avgWarnings.push(`Avg Total Hours is ${avgHours.toFixed(2)} (> 14 hours)`);
                return jsonResponse({data: {totalLoads, totalHours, avgElapsedStart, avgElapsedEnd, avgLoads, avgHours, avgLoadsPerHour, warnings, avgWarnings}}, headers);
            }
            case "export-csv": {
                const body = await parseBody(req);
                const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
                const operatorOptions: Array<{ value: string; label: string }> = Array.isArray(body?.operatorOptions) ? body.operatorOptions : [];
                const reportDate = typeof body?.reportDate === "string" ? body.reportDate : null;
                const dateStr = reportDate ? ` - ${reportDate}` : "";
                const title = `Weekly Plant Efficiency Report${dateStr}`;
                const headerRow = Array(12).fill("");
                headerRow[0] = title;
                const tableHeaders = ["Operator Name", "Truck Number", "Start Time", "1st Load", "Elapsed (Start→1st)", "EOD In Yard", "Punch Out", "Elapsed (EOD→Punch)", "Total Loads", "Total Hours", "Loads/Hour", "Comments"];
                const getOperatorName = (row: any): string => {
                    if (!row?.name) return "";
                    const found = operatorOptions.find(opt => opt.value === row.name);
                    return found?.label ?? row.displayName ?? row.name;
                };
                const csvRows: string[][] = [headerRow, tableHeaders];
                rows.forEach(row => {
                    const start = parseTimeToMinutes(row.start_time);
                    const firstLoad = parseTimeToMinutes(row.first_load);
                    const eod = parseTimeToMinutes(row.eod_in_yard);
                    const punch = parseTimeToMinutes(row.punch_out);
                    const elapsedStart = (start !== null && firstLoad !== null) ? firstLoad - start : "";
                    const elapsedEnd = (eod !== null && punch !== null) ? punch - eod : "";
                    const hrs = (start !== null && punch !== null) ? (punch - start) / 60 : "";
                    const lph = (row.loads && hrs && Number(hrs) > 0) ? (Number(row.loads) / Number(hrs)).toFixed(2) : "";
                    csvRows.push([getOperatorName(row), row.truck_number || "", row.start_time || "", row.first_load || "", elapsedStart !== "" ? `${elapsedStart} min` : "", row.eod_in_yard || "", row.punch_out || "", elapsedEnd !== "" ? `${elapsedEnd} min` : "", row.loads?.toString?.() || "", hrs !== "" ? Number(hrs).toFixed(2) : "", lph, row.comments || ""]);
                });
                const csv = csvRows.map(r => r.map(csvEscape).join(',')).join('\r\n');
                const filename = `Weekly Plant Efficiency Report${reportDate ? ' - ' + reportDate.replace(/[^0-9-]/g, '') : ''}.csv`;
                return jsonResponse({data: {filename, csv}}, headers);
            }
            case "week-range": {
                const body = await parseBody(req);
                const weekIso = typeof body?.weekIso === "string" ? body.weekIso : null;
                if (!weekIso) return errorResponse("weekIso is required", headers, 400);
                const monday = new Date(weekIso);
                monday.setDate(monday.getDate() + 1);
                monday.setHours(0, 0, 0, 0);
                const saturday = new Date(monday);
                saturday.setDate(monday.getDate() + 5);
                return jsonResponse({data: {range: `${formatDateMMDDYY(monday)} through ${formatDateMMDDYY(saturday)}`}}, headers);
            }
            case "monday-saturday": {
                const body = await parseBody(req);
                const input = typeof body?.date === "string" ? body.date : null;
                const d = input ? new Date(input) : new Date();
                const day = d.getDay();
                const monday = new Date(d);
                monday.setDate(d.getDate() - ((day + 6) % 7));
                monday.setHours(0, 0, 0, 0);
                const saturday = new Date(monday);
                saturday.setDate(monday.getDate() + 5);
                saturday.setHours(0, 0, 0, 0);
                return jsonResponse({data: {monday: toISO(monday), saturday: toISO(saturday)}}, headers);
            }
            default:
                return errorResponse("Invalid endpoint", headers, 404, {path: url.pathname});
        }
    } catch (error) {
        return errorResponse("Internal server error", headers, 500, {message: (error as Error).message});
    }
});
