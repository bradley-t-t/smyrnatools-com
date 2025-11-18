const FormatUtility = {
    formatDate: (dateStr) => {
        if (!dateStr) return ''
        const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : (/^\d{4}-\d{2}-\d{2}T/.test(dateStr) ? dateStr.slice(0, 10) : null)
        if (isoDateOnly) {
            const [y, m, d] = isoDateOnly.split('-').map(n => parseInt(n, 10))
            if (!y || !m || !d) return dateStr
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            const monthName = monthNames[m - 1] || ''
            let suffix = 'th'
            if (d % 10 === 1 && d !== 11) suffix = 'st'
            else if (d % 10 === 2 && d !== 12) suffix = 'nd'
            else if (d % 10 === 3 && d !== 13) suffix = 'rd'
            return `${monthName} ${d}${suffix}, ${y}`
        }
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        const options = {month: 'long', day: 'numeric', year: 'numeric'}
        const formatted = date.toLocaleDateString('en-US', options)
        const day = date.getDate()
        let suffix = 'th'
        if (day % 10 === 1 && day !== 11) suffix = 'st'
        else if (day % 10 === 2 && day !== 12) suffix = 'nd'
        else if (day % 10 === 3 && day !== 13) suffix = 'rd'
        return formatted.replace(`${day}`, `${day}${suffix}`)
    },
    formatDateTime: (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        const options = {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}
        return date.toLocaleString('en-US', options)
    },

    compareVINs: (vinA, vinB) => {
        const a = String(vinA || '').toUpperCase()
        const b = String(vinB || '').toUpperCase()

        if (!a && !b) return 0
        if (!a) return 1
        if (!b) return -1

        const parseVIN = (vin) => {
            const parts = []
            let currentPart = ''
            let isNumeric = null

            for (let i = 0; i < vin.length; i++) {
                const char = vin[i]
                const charIsNumeric = /\d/.test(char)

                if (isNumeric === null) {
                    isNumeric = charIsNumeric
                    currentPart = char
                } else if (isNumeric === charIsNumeric) {
                    currentPart += char
                } else {
                    parts.push({value: currentPart, isNumeric})
                    currentPart = char
                    isNumeric = charIsNumeric
                }
            }

            if (currentPart) {
                parts.push({value: currentPart, isNumeric})
            }

            return parts
        }

        const partsA = parseVIN(a)
        const partsB = parseVIN(b)
        const maxLength = Math.max(partsA.length, partsB.length)

        for (let i = 0; i < maxLength; i++) {
            const partA = partsA[i]
            const partB = partsB[i]

            if (!partA) return -1
            if (!partB) return 1

            if (partA.isNumeric && partB.isNumeric) {
                const numA = parseInt(partA.value, 10)
                const numB = parseInt(partB.value, 10)
                if (numA !== numB) return numA - numB
            } else {
                const comparison = partA.value.localeCompare(partB.value)
                if (comparison !== 0) return comparison
            }
        }

        return 0
    }
}

export default FormatUtility
export {FormatUtility}
