class Trailer {
    constructor({
        id = null,
        trailer_number = '',
        assigned_plant = '',
        trailer_type = 'Cement',
        assigned_tractor = null,
        cleanliness_rating = 1,
        created_at = new Date().toISOString(),
        updated_at = new Date().toISOString(),
        updated_last = null,
        updated_by = null,
        status = 'Active',
        latestHistoryDate = null,
        openIssuesCount = 0,
        commentsCount = 0
    } = {}) {
        this.id = id || crypto.randomUUID()
        this.trailerNumber = trailer_number
        this.assignedPlant = assigned_plant
        this.trailerType = trailer_type
        this.assignedTractor = assigned_tractor
        this.cleanlinessRating = cleanliness_rating
        this.createdAt = created_at
        this.updatedAt = updated_at
        this.updatedLast = updated_last
        this.updatedBy = updated_by
        this.status = status
        this.latestHistoryDate = latestHistoryDate
        this.openIssuesCount = openIssuesCount
        this.commentsCount = commentsCount
    }

    static fromApiFormat(apiData) {
        return new Trailer({
            assigned_plant: apiData.assigned_plant,
            assigned_tractor: apiData.assigned_tractor,
            cleanliness_rating: apiData.cleanliness_rating,
            commentsCount: apiData.commentsCount,
            created_at: apiData.created_at,
            id: apiData.id,
            latestHistoryDate: apiData.latestHistoryDate,
            openIssuesCount: apiData.openIssuesCount,
            status: apiData.status,
            trailer_number: apiData.trailer_number,
            trailer_type: apiData.trailer_type,
            updated_at: apiData.updated_at,
            updated_by: apiData.updated_by,
            updated_last: apiData.updated_last
        })
    }

    static ensureInstance(data) {
        return data instanceof Trailer ? data : Trailer.fromApiFormat(data)
    }

    toApiFormat() {
        return {
            assigned_plant: this.assignedPlant,
            assigned_tractor: this.assignedTractor,
            cleanliness_rating: this.cleanlinessRating,
            created_at: this.createdAt,
            id: this.id,
            status: this.status,
            trailer_number: this.trailerNumber,
            trailer_type: this.trailerType,
            updated_at: this.updatedAt,
            updated_by: this.updatedBy,
            updated_last: this.updatedLast
        }
    }

    isVerified(latestHistoryDate = null) {
        if (!this.updatedLast || !this.updatedBy) return false
        const lastVerification = new Date(this.updatedLast)
        const lastUpdate = new Date(this.updatedAt)
        const lastHistory = latestHistoryDate ? new Date(latestHistoryDate) : null
        const now = new Date()
        const lastSunday = new Date(now)
        lastSunday.setDate(now.getDate() - now.getDay())
        lastSunday.setHours(0, 0, 0, 0)
        if (lastHistory && lastHistory > lastVerification) return false
        return lastUpdate <= lastVerification && lastVerification >= lastSunday
    }
}

export default Trailer
