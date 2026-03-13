import { supabase } from './DatabaseService'
import { UserService } from './UserService'
const STORAGE_BUCKET = 'smyrna'
const STORAGE_PREFIX = 'maintenance'
const IMAGE_CACHE_CONTROL = '3600'
const PERMISSION_CREATE = 'maintenance.create'
const PERMISSION_REVIEW = 'maintenance.review'
const PERMISSION_IT = 'maintenance.it'
const PERMISSION_BYPASS_PLANT = 'maintenance.bypass.plantrestriction'
const AUTH_ERROR = 'User not authenticated'
const PERMISSION_DENIED_ERROR = 'Permission denied'
const FORM_WITH_FIELDS_SELECT = '*, maintenance_form_fields(*)'
const SUBMISSION_DETAIL_SELECT = `
    *,
    maintenance_forms(*, maintenance_form_fields(*)),
    maintenance_submission_responses(*, maintenance_form_fields(*))
`
const FREQUENCY_PERIOD_DAYS = {
    biweekly: () => 14,
    daily: (v) => v,
    monthly: (v) => 31 * v,
    quarterly: () => 92,
    weekly: (v) => 7 * v,
    yearly: (v) => 365 * v
}
const DEFAULT_PERIOD_DAYS = 7
const MS_PER_DAY = 86400000
/** Returns the current ISO timestamp. */
function now() {
    return new Date().toISOString()
}
/** Formats a Date as YYYY-MM-DD string. */
function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
/** Zeroes out the time portion of a Date for day-level comparisons. */
function startOfDay(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}
/** Resolves the current authenticated user or throws if not logged in. */
async function requireAuthenticatedUser() {
    const user = await UserService.getCurrentUser()
    if (!user?.id) throw new Error(AUTH_ERROR)
    return user
}
/** Asserts that a user has a specific permission, throwing on denial. */
async function requirePermission(userId, permission) {
    const hasPermission = await UserService.hasPermission(userId, permission)
    if (!hasPermission) throw new Error(PERMISSION_DENIED_ERROR)
}
/** Fetches the plant_code from a user's profile for plant-based access control. */
async function fetchUserPlantCode(userId) {
    const { data: profile } = await supabase.from('users_profiles').select('plant_code').eq('id', userId).maybeSingle()
    return profile?.plant_code ?? null
}
/**
 * Resolves the full set of plant codes a user can access based on bypass permissions
 * and region membership. Used for plant-scoped form visibility and review filtering.
 */
async function resolveAllowedPlantCodes(userId, hasBypass, userPlantCode) {
    const allowed = new Set()
    if (hasBypass && userPlantCode) {
        const { PlantService } = await import('./PlantService')
        const regions = await PlantService.fetchRegionsByPlantCode(userPlantCode).catch(() => [])
        for (const region of regions) {
            const plants = await PlantService.fetchRegionPlants(region.code).catch(() => [])
            plants.forEach((p) => {
                const code = p.plantCode || p.plant_code
                if (code) allowed.add(code)
            })
        }
    } else if (userPlantCode) {
        allowed.add(userPlantCode)
    }
    return allowed
}
/** Converts form field definitions into database-ready rows with ordering and timestamps. */
function buildFieldRows(fields, formId) {
    const timestamp = now()
    return fields.map((field, index) => ({
        created_at: timestamp,
        description: field.description || null,
        field_order: index,
        field_type: field.field_type,
        form_id: formId,
        image_required: field.image_required || false,
        is_required: field.is_required || false,
        label: field.label,
        options: field.options || null,
        updated_at: timestamp
    }))
}
/** Converts submission response data into database-ready rows with timestamps. */
function buildResponseRows(responses, submissionId) {
    const timestamp = now()
    return responses.map((r) => ({
        checklist_comments: r.checklist_comments || null,
        checklist_images: r.checklist_images || null,
        checklist_values: r.checklist_values || null,
        created_at: timestamp,
        field_id: r.field_id,
        image_url: r.image_url || null,
        response_value: r.response_value || null,
        submission_id: submissionId,
        updated_at: timestamp
    }))
}
/** Inserts response rows for a submission. No-op if responses array is empty. */
async function insertResponses(responses, submissionId) {
    if (!responses?.length) return
    const { error } = await supabase
        .from('maintenance_submission_responses')
        .insert(buildResponseRows(responses, submissionId))
    if (error) throw error
}
/** Replaces all existing responses for a submission (delete + re-insert). */
async function replaceResponses(responses, submissionId) {
    await supabase.from('maintenance_submission_responses').delete().eq('submission_id', submissionId)
    await insertResponses(responses, submissionId)
}
/** Inserts field definition rows for a form. No-op if fields array is empty. */
async function insertFields(fields, formId) {
    if (!fields?.length) return
    const { error } = await supabase.from('maintenance_form_fields').insert(buildFieldRows(fields, formId))
    if (error) throw error
}
/**
 * Fetches submissions eligible for review, filtered by the reviewer's permissions,
 * role weight hierarchy, and plant access scope.
 */
async function fetchReviewableSubmissions(statusFilter, orderField, orderAscending) {
    try {
        const user = await UserService.getCurrentUser()
        if (!user?.id) return []
        const hasReviewPermission = await UserService.hasPermission(user.id, PERMISSION_REVIEW).catch(() => false)
        if (!hasReviewPermission) return []
        const [hasItPermission, hasBypass] = await Promise.all([
            UserService.hasPermission(user.id, PERMISSION_IT).catch(() => false),
            UserService.hasPermission(user.id, PERMISSION_BYPASS_PLANT).catch(() => false)
        ])
        let query = supabase
            .from('maintenance_submissions')
            .select(SUBMISSION_DETAIL_SELECT)
            .order(orderField, { ascending: orderAscending })
        query = Array.isArray(statusFilter) ? query.in('status', statusFilter) : query.eq('status', statusFilter)
        const { data, error } = await query
        if (error || !data?.length) return []
        if (hasItPermission) return data
        const currentUserWeight = await UserService.getUserWeight(user.id)
        const userPlantCode = await fetchUserPlantCode(user.id)
        const allowedPlantCodes = await resolveAllowedPlantCodes(user.id, hasBypass, userPlantCode)
        const filtered = []
        for (const submission of data) {
            if (submission.submitted_by === user.id) continue
            const submitterWeight = await UserService.getUserWeight(submission.submitted_by)
            if (submitterWeight > currentUserWeight) continue
            if (allowedPlantCodes.size > 0 && (!submission.plant_code || !allowedPlantCodes.has(submission.plant_code)))
                continue
            filtered.push(submission)
        }
        return filtered
    } catch {
        return []
    }
}
/** Extracts the storage path portion from a full image URL or path. */
function extractStoragePath(imagePath) {
    return imagePath.includes(`${STORAGE_BUCKET}/`) ? imagePath.split(`${STORAGE_BUCKET}/`)[1] : imagePath
}
/**
 * Maintenance forms and submissions service.
 * Handles form CRUD, due date calculation, submission workflow (draft → submitted → reviewed),
 * image uploads, and plant-scoped access control for reviewers.
 */
export class MaintenanceService {
    /** Checks if a user has access to a specific plant (via bypass permission or direct match). */
    static async checkPlantAccess(userId, plantCode) {
        if (!userId || !plantCode) return false
        const hasBypass = await UserService.hasPermission(userId, PERMISSION_BYPASS_PLANT).catch(() => false)
        if (hasBypass) return true
        const userPlantCode = await fetchUserPlantCode(userId)
        return userPlantCode === plantCode
    }
    /** Fetches all active maintenance forms, optionally filtered by region, plant, or creator. */
    static async fetchForms(filters = {}) {
        let query = supabase
            .from('maintenance_forms')
            .select(FORM_WITH_FIELDS_SELECT)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
        if (filters.regionCode) query = query.eq('region_code', filters.regionCode)
        if (filters.plantCode) query = query.eq('plant_code', filters.plantCode)
        if (filters.createdBy) query = query.eq('created_by', filters.createdBy)
        const { data, error } = await query
        if (error) throw error
        return data || []
    }
    /** Fetches a single form by ID with its field definitions. */
    static async fetchFormById(formId) {
        const { data, error } = await supabase
            .from('maintenance_forms')
            .select(FORM_WITH_FIELDS_SELECT)
            .eq('id', formId)
            .single()
        if (error) throw error
        return data
    }
    /** Creates a new maintenance form with field definitions. */
    static async createForm(formData) {
        const user = await requireAuthenticatedUser()
        const { fields, plant_codes, ...formInfo } = formData
        const timestamp = now()
        const { data: form, error: formError } = await supabase
            .from('maintenance_forms')
            .insert({
                ...formInfo,
                created_at: timestamp,
                created_by: user.id,
                plant_codes: plant_codes || [],
                updated_at: timestamp
            })
            .select()
            .single()
        if (formError) throw formError
        await insertFields(fields, form.id)
        return this.fetchFormById(form.id)
    }
    /** Updates a form's metadata and optionally replaces its field definitions. */
    static async updateForm(formId, formData) {
        const user = await requireAuthenticatedUser()
        await requirePermission(user.id, PERMISSION_CREATE)
        const { fields, plant_codes, ...formInfo } = formData
        const { error: formError } = await supabase
            .from('maintenance_forms')
            .update({ ...formInfo, plant_codes: plant_codes || [], updated_at: now() })
            .eq('id', formId)
        if (formError) throw formError
        if (fields) {
            await supabase.from('maintenance_form_fields').delete().eq('form_id', formId)
            await insertFields(fields, formId)
        }
        return this.fetchFormById(formId)
    }
    /** Soft-deletes a form by marking it inactive. */
    static async deleteForm(formId) {
        const user = await requireAuthenticatedUser()
        await requirePermission(user.id, PERMISSION_CREATE)
        const { error } = await supabase
            .from('maintenance_forms')
            .update({ is_active: false, updated_at: now() })
            .eq('id', formId)
        if (error) throw error
        return true
    }
    /** Fetches due items with their associated forms and submissions. */
    static async fetchDueItems(filters = {}) {
        await requireAuthenticatedUser()
        let query = supabase
            .from('maintenance_due_items')
            .select(`*, maintenance_forms(*, maintenance_form_fields(*)), maintenance_submissions(*)`)
            .order('due_date', { ascending: true })
        if (filters.userId) query = query.eq('assigned_user_id', filters.userId)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.formId) query = query.eq('form_id', filters.formId)
        const { data, error } = await query
        if (error) throw error
        return data || []
    }
    /**
     * Fetches the current user's due maintenance items across all assigned forms.
     * Calculates due dates based on form frequency and checks for existing submissions.
     * Returns items sorted by overdue status first, then by due date.
     */
    static async fetchMyDueItems() {
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return []
            const userRoleIds = (await UserService.getUserRoles(user.id).catch(() => []))
                .map((r) => String(typeof r === 'object' ? r.id || r.role_id || '' : r))
                .filter(Boolean)
            const { data: allForms, error: formsError } = await supabase
                .from('maintenance_forms')
                .select(FORM_WITH_FIELDS_SELECT)
                .eq('is_active', true)
            if (formsError || !allForms?.length) return []
            const hasBypass = await UserService.hasPermission(user.id, PERMISSION_BYPASS_PLANT).catch(() => false)
            const userPlantCode = await fetchUserPlantCode(user.id)
            const regionalPlantCodes = hasBypass
                ? await resolveAllowedPlantCodes(user.id, true, userPlantCode)
                : new Set()
            const today = startOfDay(new Date())
            const dueItems = []
            for (const form of allForms) {
                const assignedRoles = (form.assigned_roles || []).map(String)
                if (!assignedRoles.length) continue
                if (!userRoleIds.length || !assignedRoles.some((roleId) => userRoleIds.includes(roleId))) continue
                const formPlantCodes = form.plant_codes || (form.plant_code ? [form.plant_code] : [])
                let plantsToCheck
                if (!formPlantCodes.length) {
                    plantsToCheck = [null]
                } else if (hasBypass) {
                    plantsToCheck =
                        regionalPlantCodes.size > 0
                            ? formPlantCodes.filter((pc) => regionalPlantCodes.has(pc))
                            : formPlantCodes
                } else if (userPlantCode) {
                    plantsToCheck = formPlantCodes.filter((pc) => pc === userPlantCode)
                } else {
                    plantsToCheck = formPlantCodes
                }
                if (!plantsToCheck.length) continue
                const dueDates = this.calculateDueDates(form, today)
                for (const plantCode of plantsToCheck) {
                    for (const dueDate of dueDates) {
                        const dueDateStr = toDateString(dueDate)
                        let submissionQuery = supabase
                            .from('maintenance_submissions')
                            .select('id, submitted_by')
                            .eq('form_id', form.id)
                            .eq('due_date', dueDateStr)
                        if (plantCode) submissionQuery = submissionQuery.eq('plant_code', plantCode)
                        const { data: existingSubmissions } = await submissionQuery
                        const mySubmission = existingSubmissions?.find((s) => s.submitted_by === user.id)
                        if (existingSubmissions?.length && !mySubmission) continue
                        const isCompleted = !!mySubmission
                        const isOverdue = dueDate <= today && !isCompleted
                        dueItems.push({
                            due_date: dueDateStr,
                            form,
                            form_id: form.id,
                            id: `${form.id}-${dueDateStr}-${plantCode || 'all'}`,
                            plant_code: plantCode,
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
        } catch {
            return []
        }
    }
    /**
     * Calculates the relevant due dates for a form relative to a reference date.
     * Returns the previous, current, and next period due dates based on the form's
     * frequency configuration (daily, weekly, biweekly, monthly, quarterly, yearly).
     */
    static calculateDueDates(form, referenceDate) {
        const { frequency, frequency_value: frequencyValue = 1 } = form
        const formStartDate = startOfDay(
            form.start_date
                ? new Date(form.start_date + 'T00:00:00')
                : form.created_at
                  ? new Date(form.created_at)
                  : new Date()
        )
        const today = startOfDay(referenceDate)
        const periodFn = FREQUENCY_PERIOD_DAYS[frequency]
        const periodDays = periodFn ? periodFn(frequencyValue) : DEFAULT_PERIOD_DAYS
        if (formStartDate > today) return [new Date(formStartDate)]
        const daysSinceStart = Math.floor((today - formStartDate) / MS_PER_DAY)
        const currentPeriodIndex = Math.floor(daysSinceStart / periodDays)
        const addPeriod = (index) => {
            const d = new Date(formStartDate)
            d.setDate(d.getDate() + index * periodDays)
            return d
        }
        const results = []
        if (currentPeriodIndex > 0) results.push(addPeriod(currentPeriodIndex - 1))
        results.push(addPeriod(currentPeriodIndex))
        results.push(addPeriod(currentPeriodIndex + 1))
        return results
    }
    /**
     * Submits a completed form, cleaning up any existing draft for the same form/date/user.
     * Creates the submission record and inserts all response rows.
     */
    static async submitForm(formId, dueDate, responses, plantCode = null) {
        const user = await requireAuthenticatedUser()
        const { data: existingDraft } = await supabase
            .from('maintenance_submissions')
            .select('id')
            .eq('form_id', formId)
            .eq('due_date', dueDate)
            .eq('submitted_by', user.id)
            .eq('status', 'draft')
            .maybeSingle()
        if (existingDraft) {
            await supabase.from('maintenance_submission_responses').delete().eq('submission_id', existingDraft.id)
            await supabase.from('maintenance_submissions').delete().eq('id', existingDraft.id)
        }
        const timestamp = now()
        const { data: submission, error: submissionError } = await supabase
            .from('maintenance_submissions')
            .insert({
                created_at: timestamp,
                due_date: dueDate,
                form_id: formId,
                plant_code: plantCode,
                status: 'submitted',
                submitted_at: timestamp,
                submitted_by: user.id,
                updated_at: timestamp
            })
            .select()
            .single()
        if (submissionError) throw submissionError
        await insertResponses(responses, submission.id)
        return submission
    }
    /** Updates the responses of an existing submission. */
    static async updateSubmission(submissionId, responses) {
        const user = await requireAuthenticatedUser()
        const { error: updateError } = await supabase
            .from('maintenance_submissions')
            .update({ updated_at: now() })
            .eq('id', submissionId)
            .eq('submitted_by', user.id)
        if (updateError) throw updateError
        await replaceResponses(responses, submissionId)
        return true
    }
    /**
     * Saves draft progress for a form submission, creating a new draft record
     * or updating an existing one. Enables resume-later functionality.
     */
    static async saveDraftProgress(formId, dueDate, responses, plantCode = null, existingSubmissionId = null) {
        const user = await requireAuthenticatedUser()
        let submissionId = existingSubmissionId
        if (!submissionId) {
            const { data: existing } = await supabase
                .from('maintenance_submissions')
                .select('id')
                .eq('form_id', formId)
                .eq('due_date', dueDate)
                .eq('submitted_by', user.id)
                .eq('status', 'draft')
                .maybeSingle()
            submissionId = existing?.id ?? null
        }
        if (submissionId) {
            const { error: updateError } = await supabase
                .from('maintenance_submissions')
                .update({ updated_at: now() })
                .eq('id', submissionId)
            if (updateError) throw updateError
            await supabase.from('maintenance_submission_responses').delete().eq('submission_id', submissionId)
        } else {
            const timestamp = now()
            const { data: submission, error: submissionError } = await supabase
                .from('maintenance_submissions')
                .insert({
                    created_at: timestamp,
                    due_date: dueDate,
                    form_id: formId,
                    plant_code: plantCode,
                    status: 'draft',
                    submitted_by: user.id,
                    updated_at: timestamp
                })
                .select()
                .single()
            if (submissionError) throw submissionError
            submissionId = submission.id
        }
        await insertResponses(responses, submissionId)
        return submissionId
    }
    /** Fetches a user's draft submission for a specific form/date/plant combination. */
    static async fetchDraft(formId, dueDate, plantCode = null) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) return null
        let query = supabase
            .from('maintenance_submissions')
            .select('*, maintenance_submission_responses (*)')
            .eq('form_id', formId)
            .eq('due_date', dueDate)
            .eq('submitted_by', user.id)
            .eq('status', 'draft')
        if (plantCode) query = query.eq('plant_code', plantCode)
        const { data, error } = await query.maybeSingle()
        return error ? null : data
    }
    /** Fetches submissions with optional filters, including full form and response details. */
    static async fetchSubmissions(filters = {}) {
        let query = supabase
            .from('maintenance_submissions')
            .select(`*, maintenance_forms(*), maintenance_submission_responses(*, maintenance_form_fields(*))`)
            .order('submitted_at', { ascending: false })
        if (filters.formId) query = query.eq('form_id', filters.formId)
        if (filters.submittedBy) query = query.eq('submitted_by', filters.submittedBy)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.reviewedBy) query = query.eq('reviewed_by', filters.reviewedBy)
        const { data, error } = await query
        if (error) throw error
        return data || []
    }
    /** Fetches a single submission with full details (form fields, responses). */
    static async fetchSubmissionById(submissionId) {
        const { data, error } = await supabase
            .from('maintenance_submissions')
            .select(SUBMISSION_DETAIL_SELECT)
            .eq('id', submissionId)
            .single()
        if (error) throw error
        return data
    }
    /** Records a review decision (approved/rejected) with optional notes. */
    static async reviewSubmission(submissionId, status, notes = '') {
        const user = await requireAuthenticatedUser()
        await requirePermission(user.id, PERMISSION_REVIEW)
        const { data, error } = await supabase
            .from('maintenance_submissions')
            .update({
                review_notes: notes,
                reviewed_at: now(),
                reviewed_by: user.id,
                status,
                updated_at: now()
            })
            .eq('id', submissionId)
            .select()
            .single()
        if (error) throw error
        return data
    }
    /** Fetches all submitted (pending review) submissions visible to the current reviewer. */
    static async fetchPendingReviews() {
        return fetchReviewableSubmissions('submitted', 'submitted_at', true)
    }
    /** Fetches all submissions created by a specific user. */
    static async fetchMySubmissions(userId) {
        try {
            if (!userId) return []
            const { data, error } = await supabase
                .from('maintenance_submissions')
                .select(SUBMISSION_DETAIL_SELECT)
                .eq('submitted_by', userId)
                .order('submitted_at', { ascending: false })
            return error ? [] : data || []
        } catch {
            return []
        }
    }
    /** Fetches all reviewed (approved/rejected) submissions visible to the current reviewer. */
    static async fetchReviewedSubmissions() {
        return fetchReviewableSubmissions(['approved', 'rejected'], 'reviewed_at', false)
    }
    /** Checks the current user's maintenance create and review permissions. */
    static async checkPermissions() {
        try {
            const user = await UserService.getCurrentUser()
            if (!user?.id) return { canCreate: false, canReview: false }
            const [canCreate, canReview] = await Promise.all([
                UserService.hasPermission(user.id, PERMISSION_CREATE).catch(() => false),
                UserService.hasPermission(user.id, PERMISSION_REVIEW).catch(() => false)
            ])
            return { canCreate, canReview }
        } catch {
            return { canCreate: false, canReview: false }
        }
    }
    /** Uploads an image file to Supabase storage for a form field response. */
    static async uploadImage(file, formId, fieldId) {
        const user = await requireAuthenticatedUser()
        const sanitizedFieldId = String(fieldId).replace(/[^a-zA-Z0-9_-]/g, '_')
        const fileExt = file.name.split('.').pop()
        const fileName = `${STORAGE_PREFIX}/${formId}/${sanitizedFieldId}/${user.id}_${Date.now()}.${fileExt}`
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, {
            cacheControl: IMAGE_CACHE_CONTROL,
            upsert: false
        })
        if (error) throw new Error('Failed to upload image: ' + error.message)
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
        return urlData?.publicUrl || fileName
    }
    /** Deletes an image from Supabase storage by its path. */
    static async deleteImage(imagePath) {
        const path = extractStoragePath(imagePath)
        const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
        if (error) throw new Error('Failed to delete image: ' + error.message)
        return true
    }
    /** Resolves an image path to its public URL, handling both relative and absolute paths. */
    static getImageUrl(imagePath) {
        if (!imagePath || typeof imagePath !== 'string') return null
        const trimmed = imagePath.trim()
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
        let path = extractStoragePath(trimmed)
        if (!path.startsWith(`${STORAGE_PREFIX}/`) && !path.includes('/')) return null
        if (!path.startsWith(`${STORAGE_PREFIX}/`)) path = `${STORAGE_PREFIX}/${path}`
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        return data?.publicUrl || null
    }
}
export default MaintenanceService
