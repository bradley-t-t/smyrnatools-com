export function buildReportSubmittedEmail({
                                              reportTitle,
                                              reportName,
                                              weekVerbose,
                                              submittedByName,
                                              submittedByEmail,
                                              submittedAt,
                                              reportUrl,
                                              theme,
                                              logoUrl,
                                              fromName
                                          }) {
    const safeTheme = theme || {}
    const t = {
        white: safeTheme.white || "#ffffff",
        bgDark: safeTheme.bgDark || "#1a202c",
        bgLight: safeTheme.bgLight || "#f7fafc",
        text: safeTheme.text || "#2d3748",
        textMuted: safeTheme.textMuted || "#718096",
        brand: safeTheme.brand || "#003896",
        border: safeTheme.border || "#e2e8f0",
        onBrand: safeTheme.onBrand || "#ffffff",
        success: safeTheme.success || "#38a169"
    }
    const css = {
        bg: c => (c ? `background-color: ${c};` : ""),
        color: c => (c ? `color: ${c};` : ""),
        border: c => (c ? `border: 1px solid ${c};` : "")
    }
    const styles = {
        body: `margin: 0; padding: 40px 20px; ${css.bg("#f0f4f8")} font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;`.trim(),
        container: `max-width: 600px; ${css.bg(t.white)} font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1);`.trim(),
        header: `${css.bg(t.bgDark)} padding: 32px 24px; text-align: center;`.trim(),
        headerText: `font-size: 24px; font-weight: 700; ${css.color(t.onBrand)} letter-spacing: -0.02em;`.trim(),
        section: `padding: 40px 32px; ${css.bg(t.white)}`.trim(),
        h1: `font-size: 28px; ${css.color(t.text)} margin: 0 0 12px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;`.trim(),
        greeting: `font-size: 18px; ${css.color(t.text)} margin: 0 0 24px; font-weight: 500;`.trim(),
        p: `font-size: 16px; ${css.color(t.text)} line-height: 1.6; margin: 0 0 20px;`.trim(),
        infoBox: `${css.bg("#fafbfc")} ${css.border(t.border)} border-radius: 8px; padding: 20px 24px; margin: 24px 0;`.trim(),
        infoLabel: `font-size: 13px; ${css.color(t.textMuted)} text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin: 0 0 6px;`.trim(),
        infoValue: `font-size: 16px; ${css.color(t.text)} font-weight: 600; margin: 0 0 16px;`.trim(),
        infoValueLast: `font-size: 16px; ${css.color(t.text)} font-weight: 600; margin: 0;`.trim(),
        btnContainer: `margin: 32px 0; text-align: center;`.trim(),
        btnA: `display: inline-block; padding: 16px 32px; ${css.bg(t.brand)} ${css.color(t.onBrand)} text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 56, 150, 0.2);`.trim(),
        successBox: `${css.bg("#f0fdf4")} border-left: 4px solid ${t.success}; padding: 16px 20px; border-radius: 6px; margin: 24px 0;`.trim(),
        successTitle: `font-size: 15px; ${css.color(t.text)} font-weight: 700; margin: 0 0 8px;`.trim(),
        successText: `font-size: 14px; ${css.color(t.text)} line-height: 1.5; margin: 0;`.trim(),
        divider: `height: 1px; ${css.bg(t.border)} margin: 32px 0;`.trim(),
        footer: `${css.bg(t.bgLight)} padding: 24px 32px; text-align: center;`.trim(),
        footerText: `${css.color(t.textMuted)} font-size: 13px; line-height: 1.6; margin: 0;`.trim(),
        link: `${css.color(t.brand)} text-decoration: none; font-weight: 500;`.trim()
    }
    const safeTitle = reportTitle || reportName || "Report"
    const safeName = submittedByName || submittedByEmail || "User"
    const safeAt = submittedAt ? new Date(submittedAt) : new Date()
    const atText = safeAt.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        dateStyle: 'full',
        timeStyle: 'short'
    })
    const subject = `${safeTitle} Submitted by ${safeName}`
    const plainWeek = weekVerbose ? ` for ${weekVerbose}` : ""
    const text = `${safeName} submitted ${safeTitle}${plainWeek}.\nSubmitted at: ${atText}\n${submittedByEmail ? `Submitted by: ${submittedByEmail}\n` : ""}${reportUrl ? `Review: ${reportUrl}` : ""}`.trim()
    const year = new Date().getFullYear()
    const hasLogo = typeof logoUrl === "string" && logoUrl.startsWith("http")
    const headerInner = hasLogo
        ? `<img src="${logoUrl}" alt="${fromName || "Smyrna Tools"}" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;" />`
        : `<div style="${styles.headerText}">${fromName || "Smyrna Tools"}</div>`
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Submitted</title>
</head>
<body style="${styles.body}">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="${styles.container}">
        <tr>
          <td style="${styles.header}">
            ${headerInner}
          </td>
        </tr>
        <tr>
          <td style="${styles.section}">
            <h1 style="${styles.h1}">Report Submitted Successfully</h1>
            <p style="${styles.greeting}">Hello,</p>
            <p style="${styles.p}"><strong>${safeName}</strong> has submitted the <strong>${safeTitle}</strong>${weekVerbose ? ` for <strong>${weekVerbose}</strong>` : ""}.</p>
            
            <div style="${styles.successBox}">
              <p style="${styles.successTitle}">✓ Submission Confirmed</p>
              <p style="${styles.successText}">The report has been successfully submitted and is now ready for your review.</p>
            </div>

            <div style="${styles.infoBox}">
              <p style="${styles.infoLabel}">Submitted At</p>
              <p style="${styles.infoValue}">${atText}</p>
              ${submittedByEmail ? `
              <p style="${styles.infoLabel}">Submitted By</p>
              <p style="${styles.infoValue}">${safeName}</p>
              <p style="${styles.infoLabel}">Email</p>
              <p style="${styles.infoValueLast}">${submittedByEmail}</p>
              ` : `
              <p style="${styles.infoLabel}">Submitted By</p>
              <p style="${styles.infoValueLast}">${safeName}</p>
              `}
            </div>

            ${reportUrl ? `
            <div style="${styles.btnContainer}">
              <a href="${reportUrl}" style="${styles.btnA}">Review Report</a>
            </div>
            ` : ""}

            <div style="${styles.divider}"></div>

            <p style="${styles.p}">Please review this report at your earliest convenience. If you have any questions or concerns, please contact the submitter directly.</p>
          </td>
        </tr>
        <tr>
          <td style="${styles.footer}">
            <p style="${styles.footerText}">
              &copy; ${year} Smyrna Tools. All rights reserved.<br />
              Built for SRM Concrete | <a href="https://smyrnatools.com" style="${styles.link}">smyrnatools.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
    return {subject, text, html}
}
