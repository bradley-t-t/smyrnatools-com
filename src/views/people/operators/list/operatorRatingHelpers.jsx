import React from 'react'

import StarRating from '../../../../app/components/common/StarRating'

const RATING_ELIGIBLE_STATUSES = ['Active', 'Light Duty', 'Training']

/** Renders the 5-star rating block via the centralized StarRating component
 *  (handles "Not Rated" fallback internally for null / 0 values). Sized to
 *  match the canonical asset list row star (xs = 10px) so operator and asset
 *  list views render at the same row height. */
export const renderStars = (val) => <StarRating value={Number(val) || 0} tone="warning" size="xs" />

/** Shows stars only for statuses where rating is meaningful; everyone else gets N/A. */
export const renderStarsOrNA = (operator) => {
    if (!RATING_ELIGIBLE_STATUSES.includes(operator.status)) {
        return <span className="text-text-tertiary text-[11.5px] italic">N/A</span>
    }
    return renderStars(operator.rating)
}
