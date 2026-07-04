/** Bare plant code label. Previously joined co-located sibling codes with
 *  "/" but no live caller ever supplied the colocation map that made that
 *  branch fire, so the helper now just trims the code. */
export function formatColocatedCodeLabel(primaryCode: string | null | undefined): string {
    return String(primaryCode ?? '').trim()
}
