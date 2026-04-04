/**
 * Email template sent to General Managers when a report is submitted in their region.
 * The submitter is CC'd automatically by the edge function.
 *
 * @param {Object} options
 * @param {string} options.submitterName - Display name of the person who submitted.
 * @param {string} options.reportTitle - Report type title (e.g. "Lost Load Report").
 * @param {string} [options.weekLabel] - Human-readable week label.
 * @param {string} [options.plantCode] - Submitter's plant code.
 * @param {string} [options.regionName] - Region name for the submitter's plant.
 * @param {Array<{label:string, value:string}>} [options.reportFields] - Report detail rows to display.
 * @param {string} [options.frontendUrl] - App URL for the CTA button.
 * @param {Object} [options.theme] - Theme color overrides.
 * @param {string} [options.logoUrl] - Logo image URL.
 */
/** Escapes HTML special characters to prevent injection in email templates. */
function escapeHtml(str) {
    if (typeof str !== 'string') return str
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildReportSubmittedEmail({ submitterName, reportTitle, weekLabel, plantCode, regionName, reportFields, frontendUrl, theme, logoUrl, debugInfo }) {
    const t = {
        white: theme?.white || '#ffffff',
        bgDark: theme?.bgDark || '#1a202c',
        bgLight: theme?.bgLight || '#f7fafc',
        text: theme?.text || '#2d3748',
        textMuted: theme?.textMuted || '#718096',
        brand: theme?.brand || '#003896',
        border: theme?.border || '#e2e8f0',
        onBrand: theme?.onBrand || '#ffffff'
    }

    const logo = logoUrl || 'https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png'
    const appUrl = frontendUrl || 'https://smyrnatools.com'
    const year = new Date().getFullYear()
    const name = escapeHtml(submitterName) || 'A team member'
    const week = weekLabel ? ` for ${escapeHtml(weekLabel)}` : ''
    const plant = plantCode ? ` (Plant ${escapeHtml(plantCode)})` : ''
    const region = escapeHtml(regionName) || 'your region'
    const fields = Array.isArray(reportFields) ? reportFields.filter(f => f.label && f.value) : []

    const detailRows = fields.map(f => `
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:130px;vertical-align:top;">${escapeHtml(f.label)}</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${escapeHtml(f.value)}</td>
                    </tr>`).join('')

    const subject = `${reportTitle} Submitted — ${name}${plant}`
    const text = `${name}${plant} has submitted their ${reportTitle}${week} in the ${region} region.${fields.length ? '\n\nDetails:\n' + fields.map(f => `${f.label}: ${f.value}`).join('\n') : ''}\n\nView reports at ${appUrl}`
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} Submitted</title>
</head>
<body style="margin:0;padding:40px 20px;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${t.white};margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07),0 10px 15px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${t.bgLight};padding:32px 24px;text-align:center;">
            <img src="${logo}" alt="Smyrna Tools" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;background-color:${t.white};">
            <h1 style="font-size:24px;color:${t.text};margin:0 0 8px;font-weight:700;">Report Submitted</h1>
            <p style="font-size:16px;color:${t.text};line-height:1.6;margin:0 0 24px;">
              ${name} has submitted their <strong>${reportTitle}</strong>${week} in the ${region} region.
            </p>

            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${t.bgLight};border:1px solid ${t.border};border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:130px;">Report</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${reportTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:130px;">Submitted by</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${name}${plant}</td>
                    </tr>
                    ${weekLabel ? `<tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:130px;">Week</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${weekLabel}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:130px;">Region</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${region}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${fields.length ? `
            <h2 style="font-size:18px;color:${t.text};margin:0 0 12px;font-weight:600;">Report Details</h2>
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${t.bgLight};border:1px solid ${t.border};border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    ${detailRows}
                  </table>
                </td>
              </tr>
            </table>
            ` : ''}

            <div style="text-align:center;margin:0 0 8px;">
              <a href="${appUrl}" style="display:inline-block;padding:14px 28px;background-color:${t.brand};color:${t.onBrand};text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View Reports</a>
            </div>
          </td>
        </tr>
        ${debugInfo ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fefce8;border:2px solid #ca8a04;border-radius:8px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="font-size:12px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">&#9888; Debug Enabled</div>
                  <div style="font-size:13px;color:#78350f;line-height:1.6;">
                    <strong>Would have sent to:</strong> ${debugInfo.realTo}<br/>
                    <strong>Would have CC'd:</strong> ${debugInfo.realCc || 'none'}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}
        <tr>
          <td style="background-color:${t.bgLight};padding:24px 32px;text-align:center;">
            <p style="color:${t.textMuted};font-size:13px;line-height:1.6;margin:0;">
              &copy; ${year} Smyrna Tools. All rights reserved.<br />
              Built for SRM Concrete | <a href="https://smyrnatools.com" style="color:${t.brand};text-decoration:none;font-weight:500;">smyrnatools.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`

    return { subject, text, html }
}
