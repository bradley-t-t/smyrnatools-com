export function buildForgotPasswordEmail({ newPassword, loginUrl, theme, logoUrl }) {
    const safeTheme = theme || {}
    const t = {
        white: safeTheme.white || '#ffffff',
        bgDark: safeTheme.bgDark || '#1a202c',
        bgLight: safeTheme.bgLight || '#f7fafc',
        text: safeTheme.text || '#2d3748',
        textMuted: safeTheme.textMuted || '#718096',
        brand: safeTheme.brand || '#003896',
        border: safeTheme.border || '#e2e8f0',
        onBrand: safeTheme.onBrand || '#ffffff',
        success: safeTheme.success || '#38a169',
        warning: safeTheme.warning || '#dd6b20'
    }
    const css = {
        bg: (c) => (c ? `background-color: ${c};` : ''),
        color: (c) => (c ? `color: ${c};` : ''),
        border: (c) => (c ? `border: 1px solid ${c};` : '')
    }
    const styles = {
        body: `margin: 0; padding: 40px 20px; ${css.bg('#f0f4f8')} font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;`.trim(),
        container:
            `max-width: 600px; ${css.bg(t.white)} font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1);`.trim(),
        header: `${css.bg(t.bgDark)} padding: 32px 24px; text-align: center;`.trim(),
        headerText: `font-size: 24px; font-weight: 700; ${css.color(t.onBrand)} letter-spacing: -0.02em;`.trim(),
        section: `padding: 40px 32px; ${css.bg(t.white)}`.trim(),
        h1: `font-size: 28px; ${css.color(t.text)} margin: 0 0 12px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;`.trim(),
        greeting: `font-size: 18px; ${css.color(t.text)} margin: 0 0 24px; font-weight: 500;`.trim(),
        p: `font-size: 16px; ${css.color(t.text)} line-height: 1.6; margin: 0 0 20px;`.trim(),
        pwdContainer: `margin: 32px 0;`.trim(),
        pwdLabel:
            `font-size: 13px; ${css.color(t.textMuted)} text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin: 0 0 12px; text-align: center;`.trim(),
        pwdBoxTable:
            `${css.bg('#fafbfc')} ${css.border(t.border)} border-radius: 8px; padding: 20px 24px; text-align: center;`.trim(),
        pwd: `font-size: 24px; ${css.color(t.brand)} font-weight: 700; letter-spacing: 0.5px; font-family: 'Courier New', Courier, monospace;`.trim(),
        btnContainer: `margin: 32px 0; text-align: center;`.trim(),
        btnA: `display: inline-block; padding: 16px 32px; ${css.bg(t.brand)} ${css.color(t.onBrand)} text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 56, 150, 0.2);`.trim(),
        divider: `height: 1px; ${css.bg(t.border)} margin: 32px 0;`.trim(),
        warningBox:
            `${css.bg('#fff5f5')} border-left: 4px solid ${t.warning}; padding: 16px 20px; border-radius: 6px; margin: 24px 0;`.trim(),
        warningTitle: `font-size: 15px; ${css.color(t.text)} font-weight: 700; margin: 0 0 8px;`.trim(),
        warningText: `font-size: 14px; ${css.color(t.text)} line-height: 1.5; margin: 0;`.trim(),
        muted: `font-size: 14px; ${css.color(t.textMuted)} line-height: 1.6; margin: 20px 0;`.trim(),
        footer: `${css.bg(t.bgLight)} padding: 24px 32px; text-align: center;`.trim(),
        footerText: `${css.color(t.textMuted)} font-size: 13px; line-height: 1.6; margin: 0;`.trim(),
        link: `${css.color(t.brand)} text-decoration: none; font-weight: 500;`.trim()
    }
    const subject = 'Smyrna Tools - Your New Password'
    const text = `Your new password is: ${newPassword}\nPlease log in at ${loginUrl} and change your password as soon as possible.\nFor security, do not share this password with anyone.`
    const year = new Date().getFullYear()
    const fallbackLogo = logoUrl || 'https://smyrnatools.com/static/media/SmyrnaLogo.d7f873f3da1747602db3.png'
    const hasLogo = typeof fallbackLogo === 'string' && fallbackLogo.startsWith('http')
    const headerInner = hasLogo
        ? `<img src="${fallbackLogo}" alt="Smyrna Tools" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;" />`
        : `<div style="${styles.headerText}">Smyrna Tools</div>`
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
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
            <h1 style="${styles.h1}">Password Reset</h1>
            <p style="${styles.greeting}">Hello,</p>
            <p style="${styles.p}">Your Smyrna Tools account password has been successfully reset. Below is your new temporary password:</p>
            
            <div style="${styles.pwdContainer}">
              <p style="${styles.pwdLabel}">Your New Password</p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="${styles.pwdBoxTable}">
                <tr>
                  <td style="${styles.pwd}">${newPassword}</td>
                </tr>
              </table>
            </div>

            <div style="${styles.btnContainer}">
              <a href="${loginUrl}" style="${styles.btnA}">Log In to Your Account</a>
            </div>

            <div style="${styles.divider}"></div>

            <div style="${styles.warningBox}">
              <p style="${styles.warningTitle}">🔒 Security Notice</p>
              <p style="${styles.warningText}">For your security, please change this temporary password immediately after logging in. Do not share this password with anyone.</p>
            </div>
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
    return { subject, text, html }
}
