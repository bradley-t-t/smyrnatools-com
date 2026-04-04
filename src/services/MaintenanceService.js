import APIUtility from '../utils/APIUtility'
import { Database } from './DatabaseService'
import { UserService } from './UserService'

const MAINT_FUNCTION = '/maintenance-service'
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
/** Parses a form's start date from its start_date or created_at fields. */
function parseFormStartDate(form) {
    return startOfDay(
        form.start_date
            ? new Date(form.start_date + 'T00:00:00')
            : form.created_at
              ? new Date(form.created_at)
              : new Date()
    )
}
/** Returns the last day of a given month (year, zero-based month). */
function endOfMonth(year, month) {
    const d = new Date(year, month + 1, 0)
    d.setHours(0, 0, 0, 0)
    return d
}
/** Converts a frequency to the number of months per period. */
function frequencyToMonths(frequency, frequencyValue) {
    if (frequency === 'quarterly') return 3
    if (frequency === 'yearly') return 12 * frequencyValue
    return frequencyValue // monthly
}
/** Determines which calendar period index the reference date falls in. */
function calendarPeriodIndex(frequency, frequencyValue, formStartDate, today) {
    const months = frequencyToMonths(frequency, frequencyValue)
    const startYear = formStartDate.getFullYear()
    const startMonth = formStartDate.getMonth()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    const totalMonthsElapsed = (todayYear - startYear) * 12 + (todayMonth - startMonth)
    return Math.floor(totalMonthsElapsed / months)
}
/** Returns the due date (last day of the period's final month) for a given period index. */
function calendarPeriodDueDate(frequency, frequencyValue, formStartDate, periodIndex) {
    const months = frequencyToMonths(frequency, frequencyValue)
    const startYear = formStartDate.getFullYear()
    const startMonth = formStartDate.getMonth()
    const targetMonth = startMonth + (periodIndex + 1) * months - 1
    const targetYear = startYear + Math.floor(targetMonth / 12)
    return endOfMonth(targetYear, targetMonth % 12)
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
    const { data: profile } = await Database.from('users_profiles').select('plant_code').eq('id', userId).maybeSingle()
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
            const plants = await PlantService.fetchRegionPlants(region.regionCode).catch(() => [])
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
/** Posts to the maintenance edge function. */
async function postMaint(endpoint, data) {
    const { res, json } = await APIUtility.post(`${MAINT_FUNCTION}/${endpoint}`, data)
    if (!res.ok) throw new Error(json?.error || 'Operation failed')
    return json
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
        let query = Database.from('maintenance_submissions')
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
    } catch (err) {
        console.error('Failed to fetch reviewable submissions:', err)
        return []
    }
}
/** Extracts the storage path portion from a full image URL or path. Throws if the resolved path contains directory traversal sequences. */
function extractStoragePath(imagePath) {
    const raw = imagePath.includes(`${STORAGE_BUCKET}/`) ? imagePath.split(`${STORAGE_BUCKET}/`)[1] : imagePath
    if (!raw || raw.includes('..') || raw.startsWith('/')) throw new Error('Invalid storage path')
    return raw
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
        let query = Database.from('maintenance_forms')
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
        const { data, error } = await Database.from('maintenance_forms')
            .select(FORM_WITH_FIELDS_SELECT)
            .eq('id', formId)
            .single()
        if (error) throw error
        return data
    }
    /** Creates a new maintenance form with field definitions. */
    static async createForm(formData) {
        const user = await requireAuthenticatedUser()
        const result = await postMaint('create-form', { formData, userId: user.id })
        return result.data
    }
    /** Updates a form's metadata and optionally replaces its field definitions. */
    static async updateForm(formId, formData) {
        const user = await requireAuthenticatedUser()
        await requirePermission(user.id, PERMISSION_CREATE)
        const result = await postMaint('update-form', { formData, formId })
        return result.data
    }
    /** Soft-deletes a form by marking it inactive. */
    static async deleteForm(formId) {
        const user = await requireAuthenticatedUser()
        await requirePermission(user.id, PERMISSION_CREATE)
        await postMaint('delete-form', { formId })
        return true
    }
    /** Fetches due items with their associated forms and submissions. */
    static async fetchDueItems(filters = {}) {
        await requireAuthenticatedUser()
        let query = Database.from('maintenance_due_items')
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
            const { data: allForms, error: formsError } = await Database.from('maintenance_forms')
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
                const currentDueDate = this.calculateCurrentDueDate(form, today)
                const currentDueDateStr = currentDueDate ? toDateString(currentDueDate) : null
                // Check if any submission has ever existed per plant (to detect brand-new forms)
                const historyResults = await Promise.all(
                    plantsToCheck.map((plantCode) => {
                        let query = Database.from('maintenance_submissions')
                            .select('id')
                            .eq('form_id', form.id)
                            .limit(1)
                        if (plantCode) query = query.eq('plant_code', plantCode)
                        return query
                    })
                )
                const plantHasHistory = new Map(
                    plantsToCheck.map((plantCode, i) => [plantCode, !!historyResults[i].data?.length])
                )
                // For plants with no history, only show the current period entry
                const combinations = plantsToCheck.flatMap((plantCode) => {
                    const dates = plantHasHistory.get(plantCode)
                        ? dueDates
                        : dueDates.filter((d) => toDateString(d) === currentDueDateStr)
                    return dates.map((dueDate) => ({ dueDate, dueDateStr: toDateString(dueDate), plantCode }))
                })
                const submissionResults = await Promise.all(
                    combinations.map(({ dueDateStr, plantCode }) => {
                        let query = Database.from('maintenance_submissions')
                            .select('id, submitted_by')
                            .eq('form_id', form.id)
                            .eq('due_date', dueDateStr)
                        if (plantCode) query = query.eq('plant_code', plantCode)
                        return query
                    })
                )
                for (let i = 0; i < combinations.length; i++) {
                    const { dueDate, dueDateStr, plantCode } = combinations[i]
                    const existingSubmissions = submissionResults[i].data
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
            return dueItems.sort((a, b) => {
                if (a.status === 'overdue' && b.status !== 'overdue') return -1
                if (b.status === 'overdue' && a.status !== 'overdue') return 1
                return new Date(a.due_date) - new Date(b.due_date)
            })
        } catch (err) {
            console.error('Failed to fetch my due items:', err)
            return []
        }
    }
    /**
     * Calculates the relevant due dates for a form relative to a reference date.
     * Returns the previous, current, and next period due dates based on the form's
     * frequency configuration (daily, weekly, biweekly, monthly, quarterly, yearly).
     */
    static calculateDueDates(form, referenceDate) {
        const today = startOfDay(referenceDate)
        const formStartDate = parseFormStartDate(form)
        if (formStartDate > today) return [new Date(formStartDate)]
        const { frequency, frequency_value: frequencyValue = 1 } = form
        const useCalendarMonths = ['monthly', 'quarterly', 'yearly'].includes(frequency)
        if (useCalendarMonths) {
            const currentIndex = calendarPeriodIndex(frequency, frequencyValue, formStartDate, today)
            const results = []
            if (currentIndex > 0)
                results.push(calendarPeriodDueDate(frequency, frequencyValue, formStartDate, currentIndex - 1))
            results.push(calendarPeriodDueDate(frequency, frequencyValue, formStartDate, currentIndex))
            results.push(calendarPeriodDueDate(frequency, frequencyValue, formStartDate, currentIndex + 1))
            return results
        }
        const periodFn = FREQUENCY_PERIOD_DAYS[frequency]
        const periodDays = periodFn ? periodFn(frequencyValue) : DEFAULT_PERIOD_DAYS
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
    /** Returns only the current period's due date for a form (no previous/next). */
    static calculateCurrentDueDate(form, referenceDate) {
        const today = startOfDay(referenceDate)
        const formStartDate = parseFormStartDate(form)
        if (formStartDate > today) return new Date(formStartDate)
        const { frequency, frequency_value: frequencyValue = 1 } = form
        if (['monthly', 'quarterly', 'yearly'].includes(frequency)) {
            const currentIndex = calendarPeriodIndex(frequency, frequencyValue, formStartDate, today)
            return calendarPeriodDueDate(frequency, frequencyValue, formStartDate, currentIndex)
        }
        const periodFn = FREQUENCY_PERIOD_DAYS[frequency]
        const periodDays = periodFn ? periodFn(frequencyValue) : DEFAULT_PERIOD_DAYS
        const daysSinceStart = Math.floor((today - formStartDate) / MS_PER_DAY)
        const currentPeriodIndex = Math.floor(daysSinceStart / periodDays)
        const d = new Date(formStartDate)
        d.setDate(d.getDate() + currentPeriodIndex * periodDays)
        return d
    }
    /**
     * Submits a completed form, cleaning up any existing draft for the same form/date/user.
     * Creates the submission record and inserts all response rows.
     */
    static async submitForm(formId, dueDate, responses, plantCode = null) {
        const user = await requireAuthenticatedUser()
        const result = await postMaint('submit-form', {
            dueDate,
            formId,
            plantCode,
            responses,
            userId: user.id
        })
        return result.data
    }
    /** Updates the responses of an existing submission. */
    static async updateSubmission(submissionId, responses) {
        const user = await requireAuthenticatedUser()
        await postMaint('update-submission', { responses, submissionId, userId: user.id })
        return true
    }
    /**
     * Saves draft progress for a form submission, creating a new draft record
     * or updating an existing one. Enables resume-later functionality.
     */
    static async saveDraftProgress(formId, dueDate, responses, plantCode = null, existingSubmissionId = null) {
        const user = await requireAuthenticatedUser()
        const result = await postMaint('save-draft', {
            dueDate,
            existingSubmissionId,
            formId,
            plantCode,
            responses,
            userId: user.id
        })
        return result.submissionId
    }
    /** Fetches a user's draft submission for a specific form/date/plant combination. */
    static async fetchDraft(formId, dueDate, plantCode = null) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) return null
        let query = Database.from('maintenance_submissions')
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
        let query = Database.from('maintenance_submissions')
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
        const { data, error } = await Database.from('maintenance_submissions')
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
        const result = await postMaint('review-submission', {
            notes,
            status,
            submissionId,
            userId: user.id
        })
        return result.data
    }
    /** Fetches all submitted (pending review) submissions visible to the current reviewer. */
    static async fetchPendingReviews() {
        return fetchReviewableSubmissions('submitted', 'submitted_at', true)
    }
    /** Fetches all submissions created by a specific user. */
    static async fetchMySubmissions(userId) {
        try {
            if (!userId) return []
            const { data, error } = await Database.from('maintenance_submissions')
                .select(SUBMISSION_DETAIL_SELECT)
                .eq('submitted_by', userId)
                .order('submitted_at', { ascending: false })
            return error ? [] : data || []
        } catch (err) {
            console.error('Failed to fetch my submissions:', err)
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
        } catch (err) {
            console.error('Failed to check maintenance permissions:', err)
            return { canCreate: false, canReview: false }
        }
    }
    /** Uploads an image file to database storage for a form field response. */
    static async uploadImage(file, formId, fieldId) {
        const user = await requireAuthenticatedUser()
        const sanitizedFieldId = String(fieldId).replace(/[^a-zA-Z0-9_-]/g, '_')
        const fileExt = file.name.split('.').pop()
        const fileName = `${STORAGE_PREFIX}/${formId}/${sanitizedFieldId}/${user.id}_${Date.now()}.${fileExt}`
        const { error } = await Database.storage.from(STORAGE_BUCKET).upload(fileName, file, {
            cacheControl: IMAGE_CACHE_CONTROL,
            upsert: false
        })
        if (error) throw new Error('Failed to upload image: ' + error.message)
        const { data: urlData } = Database.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
        return urlData?.publicUrl || fileName
    }
    /** Deletes an image from database storage by its path. */
    static async deleteImage(imagePath) {
        const path = extractStoragePath(imagePath)
        const { error } = await Database.storage.from(STORAGE_BUCKET).remove([path])
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
        const { data } = Database.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        return data?.publicUrl || null
    }
}
export default MaintenanceService
