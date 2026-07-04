import React from 'react'

import { formatAccountAge, formatJoinedDate, formatRelativeTime } from '../../constants/myAccountConstants'
import { StatCell } from './MyAccountAtoms'

/** 6-cell snapshot of the user's account that lives just under the header.
 *  Hints are reserved for genuinely useful context (a date the value alone
 *  can't convey, a device fingerprint, a count of related items). Cells with
 *  nothing helpful to add show no third line at all. */
export default function AccountStatStrip({ additionalPlants, joinedAt, plantCode, regionName, role, sessions }) {
    const currentSession = sessions.find((s) => s.isCurrent) || sessions[0]
    const sessionDeviceCounts = sessions.reduce(
        (acc, s) => {
            const device = (s.device || '').toLowerCase()
            if (device.includes('mobile')) acc.mobile += 1
            else if (device.includes('tablet')) acc.tablet += 1
            else acc.desktop += 1
            return acc
        },
        { desktop: 0, mobile: 0, tablet: 0 }
    )
    const sessionsHint =
        sessions.length === 0
            ? null
            : [
                  sessionDeviceCounts.desktop && `${sessionDeviceCounts.desktop} desktop`,
                  sessionDeviceCounts.mobile && `${sessionDeviceCounts.mobile} mobile`,
                  sessionDeviceCounts.tablet && `${sessionDeviceCounts.tablet} tablet`
              ]
                  .filter(Boolean)
                  .join(' · ')
    const additionalCount = additionalPlants?.length || 0
    return (
        <section className="scroll-mt-4" id="overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded overflow-hidden border border-border-light">
                <StatCell label="Account age" value={formatAccountAge(joinedAt)} hint={formatJoinedDate(joinedAt)} />
                <StatCell label="Sessions" value={sessions.length} hint={sessionsHint} />
                <StatCell label="Region" value={regionName || '—'} />
                <StatCell
                    label="Home plant"
                    value={plantCode || '—'}
                    hint={additionalCount > 0 ? `+${additionalCount} more` : null}
                />
                <StatCell label="Role" value={role || '—'} />
                <StatCell
                    label="Last sign-in"
                    value={currentSession ? formatRelativeTime(currentSession.lastActive) : '—'}
                    hint={
                        currentSession
                            ? [currentSession.browser, currentSession.os].filter(Boolean).join(' · ') || null
                            : null
                    }
                />
            </div>
        </section>
    )
}
