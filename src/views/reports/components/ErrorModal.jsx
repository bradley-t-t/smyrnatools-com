import React from 'react'

function ErrorModal({ error, onClose }) {
    const isCommentError = error.includes('Comment needs improvement')
    const errorTitle = isCommentError ? error.split(':')[0] : 'Validation Error'

    return (
        <div className="rpts-sbmt-modal-backdrop" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            <div className="rpts-sbmt-modal-content" style={{ maxWidth: '480px' }}>
                <div style={{ alignItems: 'center', display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <div
                        style={{
                            alignItems: 'center',
                            background: '#fee2e2',
                            borderRadius: '50%',
                            color: '#dc2626',
                            display: 'flex',
                            flexShrink: 0,
                            fontSize: '18px',
                            height: '40px',
                            justifyContent: 'center',
                            width: '40px'
                        }}
                    >
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <h2 style={{ color: '#1e293b', fontSize: '16px', fontWeight: 700, margin: 0 }}>{errorTitle}</h2>
                        {isCommentError && (
                            <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: 500, margin: '2px 0 0 0' }}>
                                Comment needs improvement
                            </p>
                        )}
                    </div>
                </div>

                {isCommentError ? (
                    <>
                        <div
                            style={{
                                background: '#fef2f2',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                padding: '12px'
                            }}
                        >
                            <div style={{ color: '#991b1b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                                {error.split('\n\n')[1] || 'Provide a specific reason for the timing issues.'}
                            </div>
                            {error.includes('Your comment:') && (
                                <div
                                    style={{
                                        background: '#fff',
                                        border: '1px solid #fecaca',
                                        borderRadius: '6px',
                                        marginBottom: '8px',
                                        padding: '8px 10px'
                                    }}
                                >
                                    <div
                                        style={{
                                            color: '#64748b',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            marginBottom: '2px',
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        Your Comment
                                    </div>
                                    <div style={{ color: '#1e293b', fontSize: '13px', fontStyle: 'italic' }}>
                                        {error.split('Your comment:')[1]?.split('\n\n')[0]?.trim() || ''}
                                    </div>
                                </div>
                            )}
                            {error.includes('Issues:') && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {error
                                        .split('Issues:')[1]
                                        ?.split('|')
                                        .map((issue, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    background: '#fecaca',
                                                    borderRadius: '4px',
                                                    color: '#991b1b',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    padding: '4px 8px'
                                                }}
                                            >
                                                {issue.trim()}
                                            </span>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                background: '#f0fdf4',
                                borderRadius: '8px',
                                display: 'grid',
                                gap: '8px',
                                gridTemplateColumns: '1fr 1fr',
                                marginBottom: '16px',
                                padding: '12px'
                            }}
                        >
                            <div>
                                <div
                                    style={{ color: '#166534', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}
                                >
                                    <i className="fas fa-check" style={{ marginRight: '4px' }}></i>VALID
                                </div>
                                <div style={{ color: '#166534', fontSize: '12px' }}>
                                    {'"Sent to plant 402"'}
                                    <br />
                                    {'"Truck breakdown"'}
                                </div>
                            </div>
                            <div>
                                <div
                                    style={{ color: '#991b1b', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}
                                >
                                    <i className="fas fa-times" style={{ marginRight: '4px' }}></i>INVALID
                                </div>
                                <div style={{ color: '#991b1b', fontSize: '12px' }}>
                                    {'"N/A", "mixer"'}
                                    <br />
                                    {'"none", vague'}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ background: '#fef2f2', borderRadius: '8px', marginBottom: '16px', padding: '12px' }}>
                        <div style={{ color: '#991b1b', fontSize: '13px', fontWeight: 500 }}>{error}</div>
                    </div>
                )}

                <div style={{ textAlign: 'right' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#1e3a5f',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            padding: '10px 20px'
                        }}
                    >
                        Go Back & Fix
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ErrorModal
