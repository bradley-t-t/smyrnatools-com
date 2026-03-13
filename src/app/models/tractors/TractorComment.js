/** Tractor comment record with snake_case API mapping. */
export class TractorComment {
    constructor(data = {}) {
        this.id = data.id ?? null
        this.tractorId = data.tractor_id ?? ''
        this.text = data.text ?? ''
        this.author = data.author ?? ''
        this.createdAt = data.created_at ?? new Date().toISOString()
    }
    static fromRow(row) {
        if (!row) return null
        return new TractorComment(row)
    }
    toRow() {
        return {
            author: this.author,
            created_at: this.createdAt,
            id: this.id,
            text: this.text,
            tractor_id: this.tractorId
        }
    }
}
