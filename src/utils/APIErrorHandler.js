const originalConsoleError = console.error;

console.error = (...args) => {
    const message = args.join(' ');
    if (
        message.includes('Load failed') ||
        message.includes('access control checks') ||
        message.includes('Fetch API cannot load') ||
        message.includes('due to access control')
    ) {
        return;
    }
    originalConsoleError.apply(console, args);
};

window.addEventListener('error', (event) => {
    if (event.message && (
        event.message.includes('Load failed') ||
        event.message.includes('access control checks') ||
        event.message.includes('Fetch API cannot load')
    )) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
        (event.reason.message && (
            event.reason.message.includes('Load failed') ||
            event.reason.message.includes('access control checks') ||
            event.reason.message.includes('Fetch API cannot load')
        )) ||
        (typeof event.reason === 'string' && (
            event.reason.includes('Load failed') ||
            event.reason.includes('access control checks') ||
            event.reason.includes('Fetch API cannot load')
        ))
    )) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
});

export default {};
