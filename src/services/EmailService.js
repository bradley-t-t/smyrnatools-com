import APIUtility from '../utils/APIUtility'

const DEBUG_MODE = process.env.REACT_APP_EMAIL_DEBUG === 'true'

/** Cached template context (theme, logo, URLs) fetched once from the edge function. */
let templateContextCache = null

/**
 * Centralized email service for sending templated emails via the email-service edge function.
 *
 * Usage:
 *   import { EmailService } from './EmailService'
 *   import { buildWelcomeEmail } from '../../emails/welcome-email.js'
 *
 *   await EmailService.send({
 *       template: buildWelcomeEmail,
 *       templateData: { userName: 'John' },
 *       to: ['john@example.com', { email: 'jane@example.com', name: 'Jane' }],
 *       cc: ['manager@example.com'],
 *       bcc: ['archive@example.com'],
 *       from: { email: 'custom@smyrnatools.com', name: 'Custom Sender' }
 *   })
 */
class EmailServiceImpl {
    /**
     * Fetches shared template context (theme colors, logo URL, frontend URL)
     * from the edge function. Cached after first call.
     */
    async getTemplateContext() {
        if (templateContextCache) return templateContextCache
        const { res, json } = await APIUtility.post('/email-service/template-context')
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch template context')
        templateContextCache = json
        return json
    }

    /** Clears the cached template context, forcing a fresh fetch on next use. */
    clearContextCache() {
        templateContextCache = null
    }

    /**
     * Sends an email using a .js template builder function.
     *
     * @param {Object} options
     * @param {Function} options.template - Template builder fn: (data) => { subject, html, text }
     * @param {Object} [options.templateData={}] - Data passed to the template builder.
     *   The template context (theme, logoUrl, frontendUrl) is merged in automatically.
     * @param {Array<string|{email:string, name?:string}>} options.to - Required recipient list.
     * @param {Array<string|{email:string, name?:string}>} [options.cc] - CC recipients.
     * @param {Array<string|{email:string, name?:string}>} [options.bcc] - BCC recipients.
     * @param {{email:string, name?:string}} [options.from] - Sender override (defaults to env config).
     * @param {boolean} [options.debug] - Override debug mode for this send. Defaults to REACT_APP_EMAIL_DEBUG.
     * @returns {Promise<{success:boolean, sent:boolean, recipients?:Object, reason?:string}>}
     */
    async send({ template, templateData = {}, to, cc, bcc, from, debug }) {
        if (typeof template !== 'function') throw new Error('template must be a builder function')
        if (!Array.isArray(to) || to.length === 0) throw new Error('to must be a non-empty array')

        // Fetch shared context and merge with caller-provided data
        const context = await this.getTemplateContext()
        const mergedData = { ...context, ...templateData }

        const { subject, html, text } = template(mergedData)
        if (!subject || !html) throw new Error('Template must return { subject, html } at minimum')

        const payload = {
            subject,
            html,
            ...(text ? { text } : {}),
            to,
            ...(cc?.length ? { cc } : {}),
            ...(bcc?.length ? { bcc } : {}),
            ...(from ? { from } : {}),
            debug: debug ?? DEBUG_MODE
        }

        const { res, json } = await APIUtility.post('/email-service/send', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to send email')
        return json
    }

    /**
     * Sends a raw email without a template function (subject/html provided directly).
     * Useful for one-off or system-generated emails that don't need a .js template file.
     *
     * @param {Object} options
     * @param {string} options.subject
     * @param {string} options.html
     * @param {string} [options.text]
     * @param {Array<string|{email:string, name?:string}>} options.to
     * @param {Array<string|{email:string, name?:string}>} [options.cc]
     * @param {Array<string|{email:string, name?:string}>} [options.bcc]
     * @param {{email:string, name?:string}} [options.from]
     * @param {boolean} [options.debug]
     * @returns {Promise<{success:boolean, sent:boolean, recipients?:Object, reason?:string}>}
     */
    async sendRaw({ subject, html, text, to, cc, bcc, from, debug }) {
        if (!subject || !html) throw new Error('subject and html are required')
        if (!Array.isArray(to) || to.length === 0) throw new Error('to must be a non-empty array')

        const payload = {
            subject,
            html,
            ...(text ? { text } : {}),
            to,
            ...(cc?.length ? { cc } : {}),
            ...(bcc?.length ? { bcc } : {}),
            ...(from ? { from } : {}),
            debug: debug ?? DEBUG_MODE
        }

        const { res, json } = await APIUtility.post('/email-service/send', payload)
        if (!res.ok) throw new Error(json?.error || 'Failed to send email')
        return json
    }

    /**
     * Notifies General Managers in the submitter's region that a report was submitted.
     * The edge function resolves the region, finds GMs, and CC's the submitter.
     * Fire-and-forget — does not throw on failure to avoid blocking the submission flow.
     *
     * @param {Object} options
     * @param {string} options.userId - Submitter's user ID.
     * @param {string} options.reportTitle - Display title of the report type.
     * @param {string} [options.weekLabel] - Human-readable week label (e.g., "Mar 10 – Mar 15").
     * @param {boolean} [options.debug] - Override debug mode for this send.
     */
    async notifyReportSubmitted({ userId, reportTitle, weekLabel, reportFields, attachmentUrl, debug }) {
        const { res, json } = await APIUtility.post('/email-service/notify-report-submitted', {
            userId,
            reportTitle,
            weekLabel: weekLabel || '',
            ...(reportFields?.length ? { reportFields } : {}),
            ...(attachmentUrl ? { attachmentUrl } : {}),
            debug: debug ?? DEBUG_MODE
        })
        if (!res.ok || !json?.success) {
            throw new Error(json?.reason || json?.error || 'Email notification failed to send')
        }
        return json
    }
}

export const EmailService = new EmailServiceImpl()
