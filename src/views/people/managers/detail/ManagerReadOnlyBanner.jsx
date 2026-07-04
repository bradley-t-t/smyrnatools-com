import React from 'react'

/**
 * Inline notice rendered above the manager edit cards when the caller does
 * not have permission to edit (either by role weight or by section-level
 * `canEditManager`).
 */
export default function ManagerReadOnlyBanner() {
    return (
        <div className="col-span-full flex gap-3 rounded-xl border border-border-medium bg-gradient-to-br from-bg-hover to-border-medium px-5 py-4">
            <i className="fas fa-lock text-text-secondary text-xl mt-0.5"></i>
            <div>
                <div className="text-text-primary text-[15px] font-semibold mb-1">View-Only Mode</div>
                <div className="text-text-secondary text-[13px] leading-normal">
                    You do not have permission to edit this manager. Contact an administrator if you need to make
                    changes.
                </div>
            </div>
        </div>
    )
}
