import React from 'react'

const IconWrapper = ({ icon, iconColorClass = 'text-slate-400' }) => (
    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5 sm:mb-6">
        <i className={`fas ${icon} text-4xl sm:text-5xl ${iconColorClass}`} />
    </div>
)

const TipCard = ({ icon, title, text }) => (
    <div className="flex items-center gap-3 bg-slate-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-left">
        <i className={`fas ${icon} text-indigo-500 text-lg sm:text-xl shrink-0`} />
        <div>
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs sm:text-sm text-slate-500">{text}</div>
        </div>
    </div>
)

const NoAssignmentsState = () => (
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-6 sm:p-12 text-center">
        <IconWrapper icon="fa-clipboard-list" />
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 m-0 mb-2">No Reports Assigned</h3>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed m-0 mb-5 max-w-sm">
            You do not have any reports assigned to you yet. Contact your manager if you believe this is an error.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm text-left">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                <i className="fas fa-lightbulb" />
                What are reports?
            </div>
            <p className="text-xs sm:text-sm text-amber-700 leading-relaxed m-0 mt-2">
                Reports are weekly submissions that track production metrics, safety incidents, and operational data for
                your assigned role.
            </p>
        </div>
    </div>
)

const AllCaughtUpState = () => (
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-6 sm:p-12 text-center">
        <IconWrapper icon="fa-check-circle" iconColorClass="text-emerald-500" />
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 m-0 mb-2">All Caught Up!</h3>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed m-0 mb-5 max-w-sm">
            You have completed all your assigned reports. Great job staying on top of your submissions!
        </p>
        <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-xs">
            <TipCard
                icon="fa-calendar-check"
                title="New reports every week"
                text="Check back on Monday for new weekly reports"
            />
            <TipCard icon="fa-bell" title="Stay notified" text="Enable notifications to never miss a deadline" />
        </div>
    </div>
)

const ReviewEmptyState = () => (
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-6 sm:p-12 text-center">
        <IconWrapper icon="fa-eye" />
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 m-0 mb-2">No Reports to Review</h3>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed m-0 mb-5 max-w-sm">
            There are no submitted reports waiting for your review at this time.
        </p>
        <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 max-w-md text-left">
            <i className="fas fa-info-circle text-sky-600 text-lg shrink-0 mt-0.5" />
            <div className="text-sm text-sky-700 leading-relaxed">
                Reports will appear here once team members submit them. You will be able to review and provide feedback.
            </div>
        </div>
    </div>
)

function ReportsEmptyState({ tab, hasAssigned }) {
    if (tab !== 'all') return <ReviewEmptyState />
    const hasAnyAssignment = Object.values(hasAssigned || {}).some(Boolean)
    return hasAnyAssignment ? <AllCaughtUpState /> : <NoAssignmentsState />
}

export default ReportsEmptyState
