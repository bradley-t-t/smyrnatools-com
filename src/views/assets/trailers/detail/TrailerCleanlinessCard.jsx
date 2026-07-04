import React from 'react'

import StarRating from '../../../../app/components/common/StarRating'
import DetailViewSection from '../../../../app/components/sections/DetailViewSection'

const RATING_LABELS = [null, 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

/**
 * Star-rating editor card for trailer cleanliness. Tapping the current value
 * clears the rating; tapping any other star sets it.
 */
export default function TrailerCleanlinessCard({ cleanlinessRating, onCleanlinessRatingChange, canEditTrailer }) {
    return (
        <DetailViewSection.Card title="Cleanliness Rating" icon="fas fa-broom">
            <div className="form-group">
                <label>Cleanliness Rating</label>
                <div className="flex flex-col gap-2">
                    <StarRating
                        value={cleanlinessRating}
                        onChange={canEditTrailer ? onCleanlinessRatingChange : undefined}
                        size="lg"
                        tone="warning"
                    />
                    {cleanlinessRating > 0 && (
                        <span className="text-[13px] font-semibold text-text-primary">
                            {RATING_LABELS[cleanlinessRating]}
                        </span>
                    )}
                </div>
            </div>
        </DetailViewSection.Card>
    )
}
