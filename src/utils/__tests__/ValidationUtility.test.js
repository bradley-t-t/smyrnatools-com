import { ValidationUtility } from '../ValidationUtility'

// --- Pure / synchronous methods only (async methods hit edge functions) ---

describe('ValidationUtility', () => {
    describe('isVIN', () => {
        it('accepts a valid 17-character VIN', () => {
            expect(ValidationUtility.isVIN('1HGBH41JXMN109186')).toBe(true)
        })

        it('rejects VINs shorter than 17 characters', () => {
            expect(ValidationUtility.isVIN('1HGBH41JX')).toBe(false)
        })

        it('rejects VINs longer than 17 characters', () => {
            expect(ValidationUtility.isVIN('1HGBH41JXMN1091861')).toBe(false)
        })

        it('rejects VINs containing I, O, or Q', () => {
            expect(ValidationUtility.isVIN('1HGBH41IXMN109186')).toBe(false)
            expect(ValidationUtility.isVIN('1HGBH41OXMN109186')).toBe(false)
            expect(ValidationUtility.isVIN('1HGBH41QXMN109186')).toBe(false)
        })

        it('rejects non-alphanumeric characters', () => {
            expect(ValidationUtility.isVIN('1HGBH41J-MN10918')).toBe(false)
        })

        it('rejects placeholder values like NEED or UNKNOWN', () => {
            expect(ValidationUtility.isVIN('NEEDXXXXXXXXXXX17')).toBe(false)
            expect(ValidationUtility.isVIN('UNKNOWNXXXXXXXXXX')).toBe(false)
        })

        it('rejects a single repeated character', () => {
            expect(ValidationUtility.isVIN('11111111111111111')).toBe(false)
            expect(ValidationUtility.isVIN('AAAAAAAAAAAAAAAAA')).toBe(false)
        })

        it('rejects non-string input', () => {
            expect(ValidationUtility.isVIN(null)).toBe(false)
            expect(ValidationUtility.isVIN(undefined)).toBe(false)
            expect(ValidationUtility.isVIN(12345)).toBe(false)
        })

        it('trims whitespace and normalizes case', () => {
            expect(ValidationUtility.isVIN(' 1hgbh41jxmn109186 ')).toBe(true)
        })
    })

    describe('explainVIN', () => {
        it('returns valid:true for a correct VIN', () => {
            const result = ValidationUtility.explainVIN('1HGBH41JXMN109186')
            expect(result.valid).toBe(true)
            expect(result.reasons).toHaveLength(0)
        })

        it('returns reasons for a non-string input', () => {
            const result = ValidationUtility.explainVIN(42)
            expect(result.valid).toBe(false)
            expect(result.reasons).toContain('VIN must be a string')
        })

        it('returns reasons for wrong length', () => {
            const result = ValidationUtility.explainVIN('ABC123')
            expect(result.valid).toBe(false)
            expect(result.reasons).toContain('VIN must be exactly 17 characters')
        })

        it('flags forbidden characters I, O, Q', () => {
            const result = ValidationUtility.explainVIN('1HGBH41IXMN10918')
            expect(result.reasons).toContain('VIN cannot contain the letters I, O, or Q')
        })
    })

    describe('isUUID', () => {
        it('accepts a valid lowercase UUID', () => {
            expect(ValidationUtility.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
        })

        it('accepts uppercase UUIDs', () => {
            expect(ValidationUtility.isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
        })

        it('rejects malformed UUIDs', () => {
            expect(ValidationUtility.isUUID('not-a-uuid')).toBe(false)
            expect(ValidationUtility.isUUID('')).toBe(false)
            expect(ValidationUtility.isUUID('550e8400e29b41d4a716446655440000')).toBe(false)
        })
    })

    describe('requireId', () => {
        it('returns the value when present', () => {
            expect(ValidationUtility.requireId('abc')).toBe('abc')
            expect(ValidationUtility.requireId(123)).toBe(123)
        })

        it('throws on undefined, null, or empty string', () => {
            expect(() => ValidationUtility.requireId(undefined)).toThrow('Id required')
            expect(() => ValidationUtility.requireId(null)).toThrow('Id required')
            expect(() => ValidationUtility.requireId('')).toThrow('Id required')
        })

        it('supports a custom error message', () => {
            expect(() => ValidationUtility.requireId(null, 'Missing mixer id')).toThrow('Missing mixer id')
        })
    })

    describe('requireString', () => {
        it('returns trimmed value for a valid string', () => {
            expect(ValidationUtility.requireString('  hello  ')).toBe('hello')
        })

        it('throws on empty or whitespace-only strings', () => {
            expect(() => ValidationUtility.requireString('')).toThrow('Value required')
            expect(() => ValidationUtility.requireString('   ')).toThrow('Value required')
        })

        it('throws on non-string input', () => {
            expect(() => ValidationUtility.requireString(123)).toThrow('Value required')
            expect(() => ValidationUtility.requireString(null)).toThrow('Value required')
        })
    })

    describe('requireUUID', () => {
        it('returns the UUID when valid', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000'
            expect(ValidationUtility.requireUUID(uuid)).toBe(uuid)
        })

        it('throws on invalid UUID', () => {
            expect(() => ValidationUtility.requireUUID('bad')).toThrow('Invalid id')
        })
    })

    describe('requireVIN', () => {
        it('returns uppercased trimmed VIN', () => {
            expect(ValidationUtility.requireVIN(' 1hgbh41jxmn109186 ')).toBe('1HGBH41JXMN109186')
        })

        it('throws on invalid VIN', () => {
            expect(() => ValidationUtility.requireVIN('short')).toThrow('Invalid VIN')
        })
    })

    describe('positiveInt', () => {
        it('returns the parsed integer for positive numbers', () => {
            expect(ValidationUtility.positiveInt(5)).toBe(5)
            expect(ValidationUtility.positiveInt('10')).toBe(10)
        })

        it('throws for zero, negative, or non-integer input', () => {
            expect(() => ValidationUtility.positiveInt(0)).toThrow('Positive integer required')
            expect(() => ValidationUtility.positiveInt(-1)).toThrow('Positive integer required')
            expect(() => ValidationUtility.positiveInt(3.5)).toThrow('Positive integer required')
            expect(() => ValidationUtility.positiveInt('abc')).toThrow('Positive integer required')
        })
    })

    describe('optionalString', () => {
        it('trims string values', () => {
            expect(ValidationUtility.optionalString('  hi  ')).toBe('hi')
        })

        it('returns non-string values untouched', () => {
            expect(ValidationUtility.optionalString(null)).toBeNull()
            expect(ValidationUtility.optionalString(42)).toBe(42)
        })
    })

    describe('sanitizeObject', () => {
        it('keeps only allowed keys', () => {
            const input = { a: 1, b: 2, c: 3, d: 4 }
            expect(ValidationUtility.sanitizeObject(input, ['a', 'c'])).toEqual({ a: 1, c: 3 })
        })

        it('returns empty object for non-object input', () => {
            expect(ValidationUtility.sanitizeObject(null, ['a'])).toEqual({})
            expect(ValidationUtility.sanitizeObject('string', ['a'])).toEqual({})
        })

        it('omits keys not present in the source object', () => {
            expect(ValidationUtility.sanitizeObject({ a: 1 }, ['a', 'b'])).toEqual({ a: 1 })
        })
    })

    describe('compareVINs', () => {
        it('sorts VINs with numeric segments naturally', () => {
            const vins = ['MIX10', 'MIX2', 'MIX1', 'MIX20']
            const sorted = vins.sort((a, b) => ValidationUtility.compareVINs(a, b))
            expect(sorted).toEqual(['MIX1', 'MIX2', 'MIX10', 'MIX20'])
        })

        it('returns 0 for equal VINs', () => {
            expect(ValidationUtility.compareVINs('ABC123', 'abc123')).toBe(0)
        })

        it('handles null/empty gracefully', () => {
            expect(ValidationUtility.compareVINs(null, 'A')).toBe(1)
            expect(ValidationUtility.compareVINs('A', null)).toBe(-1)
            expect(ValidationUtility.compareVINs(null, null)).toBe(0)
        })
    })
})
