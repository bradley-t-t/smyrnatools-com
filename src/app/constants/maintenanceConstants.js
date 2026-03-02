export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const IMAGE_VALIDATION_MESSAGES = {
    INVALID_TYPE: 'Please upload a valid image (JPEG, PNG, GIF, or WebP)',
    TOO_LARGE: 'Image must be less than 10MB'
}
