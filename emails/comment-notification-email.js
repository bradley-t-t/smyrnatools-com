/**
 * Email template sent to Plant Managers and District Managers when a comment
 * is added to an asset at their plant by another user.
 *
 * @param {Object} options
 * @param {string} options.commenterName - Display name of the person who commented.
 * @param {string} options.commentText - The comment body.
 * @param {string} options.assetType - Human-readable asset type (e.g. "Mixer", "Tractor").
 * @param {string} options.assetNumber - Asset identifier (unit number, etc.).
 * @param {string} options.plantCode - Plant code the asset is assigned to.
 * @param {string} [options.frontendUrl] - App URL for the CTA button.
 * @param {Object} [options.theme] - Theme color overrides.
 * @param {string} [options.logoUrl] - Logo image URL.
 */
export function buildCommentNotificationEmail({ commenterName, commentText, assetType, assetNumber, plantCode, frontendUrl, theme, logoUrl }) {
    const t = {
        white: theme?.white || '#ffffff',
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
    const name = commenterName || 'A team member'
    const asset = `${assetType || 'Asset'} ${assetNumber || ''}`
    const plant = plantCode ? `Plant ${plantCode}` : ''
    const truncatedComment = (commentText || '').length > 500 ? commentText.substring(0, 500) + '...' : (commentText || '')

    const subject = `New Comment on ${asset}${plant ? ` — ${plant}` : ''}`
    const text = `${name} commented on ${asset}${plant ? ` at ${plant}` : ''}:\n\n"${truncatedComment}"\n\nView in Smyrna Tools: ${appUrl}`
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Comment on ${asset}</title>
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
            <h1 style="font-size:24px;color:${t.text};margin:0 0 8px;font-weight:700;">New Comment</h1>
            <p style="font-size:16px;color:${t.text};line-height:1.6;margin:0 0 24px;">
              <strong>${name}</strong> commented on <strong>${asset}</strong>${plant ? ` at <strong>${plant}</strong>` : ''}.
            </p>

            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${t.bgLight};border:1px solid ${t.border};border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:100px;">Asset</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${asset}</td>
                    </tr>
                    ${plant ? `<tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:100px;">Plant</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${plant}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${t.textMuted};width:100px;">By</td>
                      <td style="padding:6px 0;font-size:14px;color:${t.text};font-weight:600;">${name}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${t.bgLight};border-left:4px solid ${t.brand};border-radius:0 8px 8px 0;margin:0 0 24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="font-size:15px;color:${t.text};line-height:1.6;margin:0;font-style:italic;">"${truncatedComment}"</p>
                </td>
              </tr>
            </table>

            <div style="text-align:center;margin:0 0 8px;">
              <a href="${appUrl}" style="display:inline-block;padding:14px 28px;background-color:${t.brand};color:${t.onBrand};text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">View in Smyrna Tools</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color:${t.bgLight};padding:24px 32px;text-align:center;">
            <p style="color:${t.textMuted};font-size:13px;line-height:1.6;margin:0;">
              &copy; ${year} Smyrna Tools. All rights reserved.<br />
              You're receiving this because you manage a plant where this asset is assigned.<br />
              <a href="${appUrl}" style="color:${t.brand};text-decoration:none;font-weight:500;">Manage notification preferences</a>
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
