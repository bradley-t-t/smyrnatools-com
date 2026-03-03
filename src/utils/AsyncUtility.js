/** Creates a debounced wrapper that delays invocation until after `delay` ms of inactivity. */
export function debounce(fn, delay) {
    let timer = null
    return (...args) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

const AsyncUtility = { debounce }
export default AsyncUtility
