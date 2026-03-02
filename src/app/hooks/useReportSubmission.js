import { useCallback } from 'react'

import { supabase } from '../../services/DatabaseService'
import { reportTypeMap } from '../../types/ReportTypes'

const EXCLUSION_REASONS_TABLE = 'report_operator_exclusion_reasons'

const persistExclusionReason = async (reportId, reason) => {
    if (!reportId || !reason) return
    await supabase.from(EXCLUSION_REASONS_TABLE).upsert({ reason, report_id: reportId }, { onConflict: 'report_id' })
}

export function useReportSubmission({ user, setLoadError, updateLocalReport }) {
    const buildUpsertData = useCallback(({ formData, weekIso, reportName, userId, completed = true }) => {
        const monday = weekIso ? new Date(weekIso) : null
        const saturday = monday ? new Date(monday.getTime() + 5 * 24 * 60 * 60 * 1000) : null
        return {
            completed: completed === true,
            data: { ...formData, week: weekIso },
            monday,
            report_date_range_end: saturday?.toISOString() || null,
            report_date_range_start: monday?.toISOString() || null,
            report_name: reportName,
            saturday,
            submitted_at: completed ? new Date().toISOString() : null,
            user_id: userId,
            week: monday?.toISOString() || null
        }
    }, [])

    const findExistingReport = useCallback(async ({ reportName, userId, weekIso }) => {
        const monday = weekIso ? new Date(weekIso) : null
        const { data, error } = await supabase
            .from('reports')
            .select('id')
            .eq('report_name', reportName)
            .eq('user_id', userId)
            .eq('week', monday?.toISOString() || null)
            .maybeSingle()
        return { data, error }
    }, [])

    const saveReport = useCallback(async ({ upsertData, existingId }) => {
        const selectFields =
            'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
        const response = existingId
            ? await supabase.from('reports').update(upsertData).eq('id', existingId).select(selectFields).single()
            : await supabase.from('reports').insert([upsertData]).select(selectFields).single()
        return response
    }, [])

    const mapReportData = useCallback(
        ({ data, weekIso, monday, saturday }) => ({
            completed: !!data.completed,
            completedDate: data.submitted_at,
            data: data.data,
            id: data.id,
            name: data.report_name,
            report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : saturday,
            report_date_range_start: data.report_date_range_start ? new Date(data.report_date_range_start) : monday,
            title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
            userId: data.user_id,
            week: data.week || data.data?.week || weekIso
        }),
        []
    )

    const submitReport = useCallback(
        async ({ showForm, formData, completed = true }) => {
            if (!showForm || !user?.id) {
                setLoadError('User not found')
                return { success: false }
            }

            const { weekIso, name: reportName } = showForm
            const upsertInfo = buildUpsertData({
                completed,
                formData,
                reportName,
                userId: user.id,
                weekIso
            })

            const { data: existing, error: findError } = await findExistingReport({
                reportName,
                userId: user.id,
                weekIso
            })

            if (findError) {
                setLoadError(findError.message || 'Error checking for existing report')
                return { success: false }
            }

            const { data, error } = await saveReport({
                existingId: existing?.id,
                upsertData: {
                    completed: upsertInfo.completed,
                    data: upsertInfo.data,
                    report_date_range_end: upsertInfo.report_date_range_end,
                    report_date_range_start: upsertInfo.report_date_range_start,
                    report_name: upsertInfo.report_name,
                    submitted_at: upsertInfo.submitted_at,
                    user_id: upsertInfo.user_id,
                    week: upsertInfo.week
                }
            })

            if (error) {
                setLoadError(error.message || 'Error submitting report')
                return { success: false }
            }

            if (data?.id) {
                await persistExclusionReason(data.id, formData.operator_exclusion_reason)
                updateLocalReport(
                    mapReportData({
                        data,
                        monday: upsertInfo.monday,
                        saturday: upsertInfo.saturday,
                        weekIso
                    })
                )
                return { success: true }
            }

            return { success: false }
        },
        [user, setLoadError, buildUpsertData, findExistingReport, saveReport, mapReportData, updateLocalReport]
    )

    const submitManagerEdit = useCallback(
        async ({ showForm, formData, managerEditUser }) => {
            if (!showForm || !managerEditUser) {
                setLoadError('No user selected for manager edit')
                return { success: false }
            }

            const { weekIso, name: reportName } = showForm
            const upsertInfo = buildUpsertData({
                completed: true,
                formData,
                reportName,
                userId: managerEditUser,
                weekIso
            })

            const { data: existing, error: findError } = await findExistingReport({
                reportName,
                userId: managerEditUser,
                weekIso
            })

            if (findError) {
                setLoadError(findError.message || 'Error checking for existing report')
                return { success: false }
            }

            const { data, error } = await saveReport({
                existingId: existing?.id,
                upsertData: {
                    completed: upsertInfo.completed,
                    data: upsertInfo.data,
                    report_date_range_end: upsertInfo.report_date_range_end,
                    report_date_range_start: upsertInfo.report_date_range_start,
                    report_name: upsertInfo.report_name,
                    submitted_at: upsertInfo.submitted_at,
                    user_id: upsertInfo.user_id,
                    week: upsertInfo.week
                }
            })

            if (error) {
                setLoadError(error.message || 'Error submitting report')
                return { success: false }
            }

            if (data?.id) {
                await persistExclusionReason(data.id, formData.operator_exclusion_reason)
                updateLocalReport(
                    mapReportData({
                        data,
                        monday: upsertInfo.monday,
                        saturday: upsertInfo.saturday,
                        weekIso
                    })
                )
                window.dispatchEvent(new CustomEvent('notifications-refresh'))
                return { success: true }
            }

            return { success: false }
        },
        [setLoadError, buildUpsertData, findExistingReport, saveReport, mapReportData, updateLocalReport]
    )

    const fetchReportForEdit = useCallback(async ({ item, userId }) => {
        if (!userId || !item?.name || !item.weekIso) {
            return null
        }

        const { data, error } = await supabase
            .from('reports')
            .select(
                'id,report_name,user_id,submitted_at,data,completed,report_date_range_start,report_date_range_end,week'
            )
            .eq('report_name', item.name)
            .eq('user_id', userId)
            .eq('week', new Date(item.weekIso).toISOString())
            .maybeSingle()

        if (!error && data) {
            return {
                completed: !!data.completed,
                completedDate: data.submitted_at,
                data: data.data,
                id: data.id,
                name: data.report_name,
                report_date_range_end: data.report_date_range_end ? new Date(data.report_date_range_end) : null,
                report_date_range_start: data.report_date_range_start ? new Date(data.report_date_range_start) : null,
                title: (reportTypeMap[data.report_name] || {}).title || data.report_name,
                userId: data.user_id,
                week: data.week || data.data?.week || item.weekIso
            }
        }

        return null
    }, [])

    return {
        fetchReportForEdit,
        submitManagerEdit,
        submitReport
    }
}
