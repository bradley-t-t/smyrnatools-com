const DatabaseUtility = {
    async checkTableSchema(supabase, tableName) {
        if (!supabase || !tableName) throw new Error('Supabase client and table name are required')
        try {
            const { data, error } = await supabase.from(tableName).select('*').limit(1)
            if (error) {
                return { columns: null, error: error.message, exists: false }
            }
            return {
                columns: data?.length ? Object.keys(data[0]) : [],
                exists: true,
                sample: data?.[0] ?? null
            }
        } catch (error) {
            return { columns: null, error: error.message, exists: false }
        }
    },
    async getRequiredFields(supabase, tableName) {
        if (!supabase || !tableName) throw new Error('Supabase client and table name are required')
        try {
            const { data, error } = await supabase.from(tableName).select('*').limit(10)
            if (error || !data?.length) {
                return []
            }
            const allFields = Object.keys(data[0])
            return allFields.filter((field) => data.every((record) => record[field] !== null))
        } catch (error) {
            return []
        }
    },
    storeDebugData(key, data) {
        if (!key || !data) throw new Error('Key and data are required')
        try {
            localStorage.setItem(
                key,
                JSON.stringify({
                    data,
                    timestamp: new Date().toISOString()
                })
            )
        } catch (error) {}
    }
}

export default DatabaseUtility
export { DatabaseUtility }
