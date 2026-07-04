import React from 'react'

import { MIXER_CLEANLINESS_LABELS } from '../../constants/mixerDetailConstants'
import StarRating from '../common/StarRating'
import DetailViewSection from '../sections/DetailViewSection'

/** Star-rating selector. Clicking a lit star toggles it off (sets to 0). */
export default function MixerCleanlinessRatingCard({ canEditMixer, cleanlinessRating, setCleanlinessRating }) {
    return (
        <DetailViewSection.Card title="Cleanliness Rating" icon="fas fa-broom">
            <div className="form-group">
                <label>Cleanliness Rating</label>
                <div className="flex flex-col gap-2">
                    <StarRating
                        value={cleanlinessRating}
                        onChange={canEditMixer ? setCleanlinessRating : undefined}
                        size="lg"
                        tone="warning"
                    />
                    {cleanlinessRating > 0 && (
                        <span className="text-[13px] font-semibold text-text-primary">
                            {MIXER_CLEANLINESS_LABELS[cleanlinessRating]}
                        </span>
                    )}
                </div>
            </div>
        </DetailViewSection.Card>
    )
}
