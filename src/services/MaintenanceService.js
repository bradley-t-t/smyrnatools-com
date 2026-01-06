import {supabase} from './DatabaseService'
import {UserService} from './UserService'

export class MaintenanceService {
    static async checkPlantAccess(userId, plantCode) {
        if (!userId || !plantCode) return false

        const hasBypass = await UserService.hasPermission(userId, 'maintenance.bypass.plantrestriction').catch(() => false)
        if (hasBypass) return true

        const {data: profile} = await supabase
            .from('users_profiles')
            .select('plant_code')
            .eq('id', userId)
            .maybeSingle()

        return profile?.plant_code === plantCode
    }

    static async fetchForms(filters = {}) {
        let query = supabase
            .from('maintenance_forms')
            .select(`
                *,
                maintenance_form_fields(*)
            `)
            .eq('is_active', true)
            .order('created_at', {ascending: false})

        if (filters.regionCode) {
            query = query.eq('region_code', filters.regionCode)
        }
        if (filters.plantCode) {
            query = query.eq('plant_code', filters.plantCode)
        }
        if (filters.createdBy) {
            query = query.eq('created_by', filters.createdBy)
        }

        const {data, error} = await query
        if (error) throw error
        return data || []
    }

    static async fetchFormById(formId) {
        const {data, error} = await supabase
            .from('maintenance_forms')
            .select(`
                *,
                maintenance_form_fields(*)
            `)
            .eq('id', formId)
            .single()

        if (error) throw error
        return data
    }

    static async createForm(formData) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        const {fields, plant_codes, ...formInfo} = formData

        const {data: form, error: formError} = await supabase
            .from('maintenance_forms')
            .insert({
                ...formInfo,
                plant_codes: plant_codes || [],
                created_by: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (formError) throw formError

        if (fields && fields.length > 0) {
            const fieldsToInsert = fields.map((field, index) => ({
                form_id: form.id,
                field_type: field.field_type,
                label: field.label,
                description: field.description || null,
                is_required: field.is_required || false,
                field_order: index,
                options: field.options || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }))

            const {error: fieldsError} = await supabase
                .from('maintenance_form_fields')
                .insert(fieldsToInsert)

            if (fieldsError) throw fieldsError
        }

        return this.fetchFormById(form.id)
    }

    static async updateForm(formId, formData) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        const hasPermission = await UserService.hasPermission(user.id, 'maintenance.create')
        if (!hasPermission) throw new Error('Permission denied')

        const {fields, plant_codes, ...formInfo} = formData

        const {error: formError} = await supabase
            .from('maintenance_forms')
            .update({
                ...formInfo,
                plant_codes: plant_codes || [],
                updated_at: new Date().toISOString()
            })
            .eq('id', formId)

        if (formError) throw formError

        if (fields) {
            await supabase
                .from('maintenance_form_fields')
                .delete()
                .eq('form_id', formId)

            if (fields.length > 0) {
                const fieldsToInsert = fields.map((field, index) => ({
                    form_id: formId,
                    field_type: field.field_type,
                    label: field.label,
                    description: field.description || null,
                    is_required: field.is_required || false,
                    field_order: index,
                    options: field.options || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }))

                const {error: fieldsError} = await supabase
                    .from('maintenance_form_fields')
                    .insert(fieldsToInsert)

                if (fieldsError) throw fieldsError
            }
        }

        return this.fetchFormById(formId)
    }

    static async deleteForm(formId) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        const hasPermission = await UserService.hasPermission(user.id, 'maintenance.create')
        if (!hasPermission) throw new Error('Permission denied')

        const {error} = await supabase
            .from('maintenance_forms')
            .update({is_active: false, updated_at: new Date().toISOString()})
            .eq('id', formId)

        if (error) throw error
        return true
    }

    static async fetchDueItems(filters = {}) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        let query = supabase
            .from('maintenance_due_items')
            .select(`
                *,
                maintenance_forms(
                    *,
                    maintenance_form_fields(*)
                ),
                maintenance_submissions(*)
            `)
            .order('due_date', {ascending: true})

        if (filters.userId) {
            query = query.eq('assigned_user_id', filters.userId)
        }
        if (filters.status) {
            query = query.eq('status', filters.status)
        }
        if (filters.formId) {
            query = query.eq('form_id', filters.formId)
        }

        const {data, error} = await query
        if (error) throw error
        return data || []
    }

    static async fetchMyDueItems() {
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return []

            const userRoles = await UserService.getUserRoles(user.id).catch(() => [])
            const userRoleIds = userRoles.map(r => {
                if (typeof r === 'object') return String(r.id || r.role_id || '')
                return String(r)
            }).filter(Boolean)

            const {data: allForms, error: formsError} = await supabase
                .from('maintenance_forms')
                .select(`
                    *,
                    maintenance_form_fields(*)
                `)
                .eq('is_active', true)

            if (formsError || !allForms || allForms.length === 0) return []

            const hasBypassPlantRestriction = await UserService.hasPermission(user.id, 'maintenance.bypass.plantrestriction').catch(() => false)
            const {data: profile} = await supabase
                .from('users_profiles')
                .select('plant_code')
                .eq('id', user.id)
                .maybeSingle()
            const userPlantCode = profile?.plant_code

            let regionalPlantCodes = new Set()
            if (hasBypassPlantRestriction) {
                try {
                    const {RegionService} = await import('./RegionService')
                    if (userPlantCode) {
                        const regions = await RegionService.fetchRegionsByPlantCode(userPlantCode).catch(() => [])
                        for (const region of regions) {
                            const plants = await RegionService.fetchRegionPlants(region.code).catch(() => [])
                            plants.forEach(p => {
                                const code = p.plantCode || p.plant_code
                                if (code) regionalPlantCodes.add(code)
                            })
                        }
                    }
                } catch (e) {
                }
            }

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const dueItems = []

            for (const form of allForms) {
                const assignedRoles = (form.assigned_roles || []).map(r => String(r))
                if (assignedRoles.length === 0) continue

                const hasRole = userRoleIds.length > 0 && assignedRoles.some(roleId => userRoleIds.includes(roleId))
                if (!hasRole) continue

                const formPlantCodes = form.plant_codes || (form.plant_code ? [form.plant_code] : [])

                let plantsToCheck = []
                if (formPlantCodes.length === 0) {
                    plantsToCheck = [null]
                } else if (hasBypassPlantRestriction) {
                    if (regionalPlantCodes.size > 0) {
                        plantsToCheck = formPlantCodes.filter(pc => regionalPlantCodes.has(pc))
                    } else {
                        plantsToCheck = formPlantCodes
                    }
                } else if (userPlantCode) {
                    plantsToCheck = formPlantCodes.filter(pc => pc === userPlantCode)
                } else {
                    plantsToCheck = formPlantCodes
                }

                if (plantsToCheck.length === 0) continue

                const dueDates = this.calculateDueDates(form, today)

                for (const plantCode of plantsToCheck) {
                    for (const dueDate of dueDates) {
                        const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`

                        let submissionQuery = supabase
                            .from('maintenance_submissions')
                            .select('id, submitted_by')
                            .eq('form_id', form.id)
                            .eq('due_date', dueDateStr)

                        if (plantCode) {
                            submissionQuery = submissionQuery.eq('plant_code', plantCode)
                        }

                        const {data: existingSubmissions} = await submissionQuery

                        const mySubmission = existingSubmissions?.find(s => s.submitted_by === user.id)
                        const anySubmission = existingSubmissions && existingSubmissions.length > 0

                        if (anySubmission && !mySubmission) continue

                        const isCompleted = !!mySubmission
                        const isOverdue = dueDate <= today && !isCompleted

                        dueItems.push({
                            id: `${form.id}-${dueDateStr}-${plantCode || 'all'}`,
                            form_id: form.id,
                            form: form,
                            plant_code: plantCode,
                            due_date: dueDateStr,
                            status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
                            submission_id: mySubmission?.id || null
                        })
                    }
                }
            }

            return dueItems.sort((a, b) => {
                if (a.status === 'overdue' && b.status !== 'overdue') return -1
                if (b.status === 'overdue' && a.status !== 'overdue') return 1
                return new Date(a.due_date) - new Date(b.due_date)
            })
        } catch (e) {
            return []
        }
    }

    static calculateDueDates(form, referenceDate) {
        const frequency = form.frequency
        const frequencyValue = form.frequency_value || 1

        let formStartDate
        if (form.start_date) {
            formStartDate = new Date(form.start_date + 'T00:00:00')
        } else if (form.created_at) {
            formStartDate = new Date(form.created_at)
        } else {
            formStartDate = new Date()
        }
        formStartDate.setHours(0, 0, 0, 0)

        const today = new Date(referenceDate)
        today.setHours(0, 0, 0, 0)

        const getPeriodDays = () => {
            switch (frequency) {
                case 'daily':
                    return 1 * frequencyValue
                case 'weekly':
                    return 7 * frequencyValue
                case 'biweekly':
                    return 14
                case 'monthly':
                    return 31 * frequencyValue
                case 'quarterly':
                    return 92
                case 'yearly':
                    return 365 * frequencyValue
                default:
                    return 7
            }
        }

        const periodDays = getPeriodDays()

        if (formStartDate > today) {
            return [new Date(formStartDate)]
        }

        const daysSinceStart = Math.floor((today - formStartDate) / (1000 * 60 * 60 * 24))
        const currentPeriodIndex = Math.floor(daysSinceStart / periodDays)

        const results = []

        if (currentPeriodIndex > 0) {
            const prevPeriodStart = new Date(formStartDate)
            prevPeriodStart.setDate(prevPeriodStart.getDate() + ((currentPeriodIndex - 1) * periodDays))
            results.push(new Date(prevPeriodStart))
        }

        const currentPeriodStart = new Date(formStartDate)
        currentPeriodStart.setDate(currentPeriodStart.getDate() + (currentPeriodIndex * periodDays))
        results.push(new Date(currentPeriodStart))

        const nextPeriodStart = new Date(formStartDate)
        nextPeriodStart.setDate(nextPeriodStart.getDate() + ((currentPeriodIndex + 1) * periodDays))
        results.push(new Date(nextPeriodStart))

        return results
    }

    static async submitForm(formId, dueDate, responses, plantCode = null) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        const {data: submission, error: submissionError} = await supabase
            .from('maintenance_submissions')
            .insert({
                form_id: formId,
                submitted_by: user.id,
                due_date: dueDate,
                plant_code: plantCode,
                status: 'submitted',
                submitted_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (submissionError) throw submissionError

        if (responses && responses.length > 0) {
            const responsesToInsert = responses.map(response => ({
                submission_id: submission.id,
                field_id: response.field_id,
                response_value: response.response_value || null,
                checklist_values: response.checklist_values || null,
                checklist_comments: response.checklist_comments || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }))

            const {error: responsesError} = await supabase
                .from('maintenance_submission_responses')
                .insert(responsesToInsert)

            if (responsesError) throw responsesError
        }

        return submission
    }

    static async updateSubmission(submissionId, responses) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        const {error: updateError} = await supabase
            .from('maintenance_submissions')
            .update({
                updated_at: new Date().toISOString()
            })
            .eq('id', submissionId)
            .eq('submitted_by', user.id)

        if (updateError) throw updateError

        await supabase
            .from('maintenance_submission_responses')
            .delete()
            .eq('submission_id', submissionId)

        if (responses && responses.length > 0) {
            const responsesToInsert = responses.map(response => ({
                submission_id: submissionId,
                field_id: response.field_id,
                response_value: response.response_value || null,
                checklist_values: response.checklist_values || null,
                checklist_comments: response.checklist_comments || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }))

            const {error: responsesError} = await supabase
                .from('maintenance_submission_responses')
                .insert(responsesToInsert)

            if (responsesError) throw responsesError
        }

        return true
    }

    static async fetchSubmissions(filters = {}) {
        let query = supabase
            .from('maintenance_submissions')
            .select(`
                *,
                maintenance_forms(*),
                maintenance_submission_responses(
                    *,
                    maintenance_form_fields(*)
                )
            `)
            .order('submitted_at', {ascending: false})

        if (filters.formId) {
            query = query.eq('form_id', filters.formId)
        }
        if (filters.submittedBy) {
            query = query.eq('submitted_by', filters.submittedBy)
        }
        if (filters.status) {
            query = query.eq('status', filters.status)
        }
        if (filters.reviewedBy) {
            query = query.eq('reviewed_by', filters.reviewedBy)
        }

        const {data, error} = await query
        if (error) throw error
        return data || []
    }

    static async fetchSubmissionById(submissionId) {
        const {data, error} = await supabase
            .from('maintenance_submissions')
            .select(`
                *,
                maintenance_forms(
                    *,
                    maintenance_form_fields(*)
                ),
                maintenance_submission_responses(
                    *,
                    maintenance_form_fields(*)
                )
            `)
            .eq('id', submissionId)
            .single()

        if (error) throw error
        return data
    }

    static async reviewSubmission(submissionId, status, notes = '') {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('User not authenticated')

        const hasPermission = await UserService.hasPermission(user.id, 'maintenance.review')
        if (!hasPermission) throw new Error('Permission denied')

        const {data, error} = await supabase
            .from('maintenance_submissions')
            .update({
                status: status,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                review_notes: notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', submissionId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    static async fetchPendingReviews() {
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return []

            const hasReviewPermission = await UserService.hasPermission(user.id, 'maintenance.review').catch(() => false)
            if (!hasReviewPermission) return []

            const hasItPermission = await UserService.hasPermission(user.id, 'maintenance.it').catch(() => false)

            const {data, error} = await supabase
                .from('maintenance_submissions')
                .select(`
                    *,
                    maintenance_forms(*),
                    maintenance_submission_responses(
                        *,
                        maintenance_form_fields(*)
                    )
                `)
                .eq('status', 'submitted')
                .order('submitted_at', {ascending: true})

            if (error) return []
            if (!data || data.length === 0) return []

            if (hasItPermission) return data

            const currentUserWeight = await UserService.getUserWeight(user.id)
            const {data: currentUserProfile} = await supabase
                .from('users_profiles')
                .select('plant_code')
                .eq('id', user.id)
                .maybeSingle()
            const currentUserPlantCode = currentUserProfile?.plant_code

            let regionalPlantCodes = new Set()
            if (currentUserPlantCode) {
                const {RegionService} = await import('./RegionService')
                const regions = await RegionService.fetchRegionsByPlantCode(currentUserPlantCode).catch(() => [])
                for (const region of regions) {
                    const plants = await RegionService.fetchRegionPlants(region.code).catch(() => [])
                    plants.forEach(p => regionalPlantCodes.add(p.plantCode))
                }
            }

            const filteredData = []
            for (const submission of data) {
                if (submission.submitted_by === user.id) continue

                const submitterWeight = await UserService.getUserWeight(submission.submitted_by)

                if (submitterWeight > currentUserWeight) continue

                const {data: submitterProfile} = await supabase
                    .from('users_profiles')
                    .select('plant_code')
                    .eq('id', submission.submitted_by)
                    .maybeSingle()
                const submitterPlantCode = submitterProfile?.plant_code

                if (regionalPlantCodes.size > 0 && submitterPlantCode) {
                    if (!regionalPlantCodes.has(submitterPlantCode)) continue
                }

                filteredData.push(submission)
            }

            return filteredData
        } catch (e) {
            return []
        }
    }

    static async fetchMySubmissions(userId) {
        try {
            if (!userId) return []

            const {data, error} = await supabase
                .from('maintenance_submissions')
                .select(`
                    *,
                    maintenance_forms(*),
                    maintenance_submission_responses(
                        *,
                        maintenance_form_fields(*)
                    )
                `)
                .eq('submitted_by', userId)
                .order('submitted_at', {ascending: false})

            if (error) return []
            return data || []
        } catch (e) {
            return []
        }
    }

    static async fetchReviewedSubmissions() {
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return []

            const hasReviewPermission = await UserService.hasPermission(user.id, 'maintenance.review').catch(() => false)
            if (!hasReviewPermission) return []

            const hasItPermission = await UserService.hasPermission(user.id, 'maintenance.it').catch(() => false)

            const {data, error} = await supabase
                .from('maintenance_submissions')
                .select(`
                    *,
                    maintenance_forms(*),
                    maintenance_submission_responses(
                        *,
                        maintenance_form_fields(*)
                    )
                `)
                .in('status', ['approved', 'rejected'])
                .order('reviewed_at', {ascending: false})

            if (error) return []
            if (!data || data.length === 0) return []

            if (hasItPermission) return data

            const currentUserWeight = await UserService.getUserWeight(user.id)
            const {data: currentUserProfile} = await supabase
                .from('users_profiles')
                .select('plant_code')
                .eq('id', user.id)
                .maybeSingle()
            const currentUserPlantCode = currentUserProfile?.plant_code

            let regionalPlantCodes = new Set()
            if (currentUserPlantCode) {
                const {RegionService} = await import('./RegionService')
                const regions = await RegionService.fetchRegionsByPlantCode(currentUserPlantCode).catch(() => [])
                for (const region of regions) {
                    const plants = await RegionService.fetchRegionPlants(region.code).catch(() => [])
                    plants.forEach(p => regionalPlantCodes.add(p.plantCode))
                }
            }

            const filteredData = []
            for (const submission of data) {
                if (submission.submitted_by === user.id) continue

                const submitterWeight = await UserService.getUserWeight(submission.submitted_by)

                if (submitterWeight > currentUserWeight) continue

                const {data: submitterProfile} = await supabase
                    .from('users_profiles')
                    .select('plant_code')
                    .eq('id', submission.submitted_by)
                    .maybeSingle()
                const submitterPlantCode = submitterProfile?.plant_code

                if (regionalPlantCodes.size > 0 && submitterPlantCode) {
                    if (!regionalPlantCodes.has(submitterPlantCode)) continue
                }

                filteredData.push(submission)
            }

            return filteredData
        } catch (e) {
            return []
        }
    }

    static async checkPermissions() {
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return {canCreate: false, canReview: false}

            const [canCreate, canReview] = await Promise.all([
                UserService.hasPermission(user.id, 'maintenance.create').catch(() => false),
                UserService.hasPermission(user.id, 'maintenance.review').catch(() => false)
            ])

            return {canCreate, canReview}
        } catch (e) {
            return {canCreate: false, canReview: false}
        }
    }
}

export default MaintenanceService
