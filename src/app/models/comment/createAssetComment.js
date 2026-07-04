/**
 * Factory for asset-comment domain models (MixerComment, TractorComment,
 * EquipmentComment, ...). Each asset's comment row has the same shape — an
 * id, author, text, createdAt, plus a single FK to the parent asset. The
 * only thing that varies is the FK field name in API responses.
 *
 * @param {Object} config
 * @param {string} config.foreignKey       - camelCase instance property (e.g. 'mixerId')
 * @param {string} config.foreignKeyColumn - snake_case DB column (e.g. 'mixer_id')
 * @returns A class with constructor, static fromRow(), and toRow() — the same
 *          surface every legacy comment model class exposes.
 */
export function createAssetComment({ foreignKey, foreignKeyColumn }) {
    class AssetComment {
        constructor(data = {}) {
            this.id = data.id ?? null
            this[foreignKey] = data[foreignKeyColumn] ?? ''
            this.text = data.text ?? ''
            this.author = data.author ?? ''
            const created = data.created_at
            this.createdAt =
                typeof created === 'string' && !isNaN(Date.parse(created)) ? created : new Date().toISOString()
        }

        static fromRow(row) {
            if (!row) return null
            return new AssetComment(row)
        }

        toRow() {
            return {
                author: this.author,
                created_at: this.createdAt,
                [foreignKeyColumn]: this[foreignKey],
                id: this.id,
                text: this.text
            }
        }
    }

    return AssetComment
}
