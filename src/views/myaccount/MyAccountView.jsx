import React, {useEffect, useState} from 'react';
import {supabase} from '../../services/DatabaseService';
import {AuthService} from '../../services/AuthService';
import {UserService} from "../../services/UserService";
import {usePreferences} from '../../app/context/PreferencesContext';

function MyAccountView({userId}) {
    const {preferences, updatePreferences} = usePreferences();
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [userRole, setUserRole] = useState('');
    const [plantCode, setPlantCode] = useState('');
    const [regionName, setRegionName] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [, setIsAuthenticated] = useState(false);
    const [, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [permittedRegions, setPermittedRegions] = useState([])
    const [regionsLoaded, setRegionsLoaded] = useState(false)
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState('')

    const getBrowserInfo = (userAgent) => {
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
        if (userAgent.includes('Edg')) return 'Edge'
        if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera'
        return 'Unknown Browser'
    }

    const getOSInfo = (userAgent) => {
        if (userAgent.includes('Windows')) return 'Windows'
        if (userAgent.includes('Mac')) return 'macOS'
        if (userAgent.includes('Linux')) return 'Linux'
        if (userAgent.includes('Android')) return 'Android'
        if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
        return 'Unknown OS'
    }

    const getDeviceInfo = (userAgent) => {
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) return 'Mobile'
        if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'Tablet'
        return 'Desktop'
    }

    const getDeviceIcon = (device) => {
        if (device === 'Mobile') return 'fa-mobile-alt'
        if (device === 'Tablet') return 'fa-tablet-alt'
        return 'fa-desktop'
    }

    const formatSessionTime = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 5) return 'Active now'
        if (diffMins < 60) return `Active ${diffMins} minutes ago`
        if (diffHours < 24) return `Active ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
        return `Active ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    }

    const handleRevokeSession = async (sessionId) => {
        if (sessionId === currentSessionId) {
            setMessage('Cannot revoke current session. Please sign out instead.')
            setTimeout(() => setMessage(''), 3000)
            return
        }
        try {
            const {error} = await supabase
                .from('users_sessions')
                .delete()
                .eq('id', sessionId)

            if (error) throw error

            setSessions(sessions.filter(s => s.id !== sessionId))
            setMessage('Session revoked successfully')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            setMessage(`Error revoking session: ${error.message}`)
            setTimeout(() => setMessage(''), 3000)
        }
    }


    useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)
            setRegionsLoaded(false)
            try {
                const {data} = await supabase.auth.getSession()
                const session = data?.session
                const uid = userId || session?.user?.id || sessionStorage.getItem('userId')
                if (!uid) {
                    setIsAuthenticated(false);
                    throw new Error('No active session or user ID')
                }
                setIsAuthenticated(true)

                const [profileData, userData, highestRole, regionsList] = await Promise.all([
                    supabase.from('users_profiles').select('first_name, last_name, plant_code').eq('id', uid).single().then(r => r.data).catch(() => null),
                    supabase.from('users').select('email').eq('id', uid).single().then(r => r.data).catch(() => null),
                    UserService.getHighestRole(uid).catch(() => null),
                    UserService.getPermittedRegions(uid).catch(() => [])
                ])

                const userEmail = session?.user?.email || userData?.email || ''
                if (userEmail) setEmail(userEmail)

                if (cancelled) return

                if (highestRole?.name) setUserRole(highestRole.name)

                if (profileData) {
                    setUser({...profileData})
                    if (profileData.first_name) setFirstName(profileData.first_name)
                    if (profileData.last_name) setLastName(profileData.last_name)
                    if (profileData.plant_code) setPlantCode(profileData.plant_code)
                }

                if (regionsList && regionsList.length) {
                    setPermittedRegions(regionsList)
                    const currentSelCode = preferences.selectedRegion?.code
                    let chosen = regionsList.find(r => (r.regionCode || r.region_code) === currentSelCode)
                    if (!chosen) chosen = regionsList[0]
                    const sel = {
                        code: chosen.regionCode || chosen.region_code || '',
                        name: chosen.regionName || chosen.region_name || '',
                        type: chosen.type || chosen.region_type || ''
                    }
                    updatePreferences('selectedRegion', sel)
                    setRegionName(sel.name)
                } else {
                    setPermittedRegions([])
                    updatePreferences('selectedRegion', {code: '', name: '', type: ''})
                    setRegionName('')
                }

                if (uid) {
                    const userAgent = navigator.userAgent
                    const currentBrowser = getBrowserInfo(userAgent)
                    const currentOS = getOSInfo(userAgent)
                    const currentDevice = getDeviceInfo(userAgent)

                    const {data: existingSessions} = await supabase
                        .from('users_sessions')
                        .select('*')
                        .eq('user_id', uid)
                        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                        .order('last_active', {ascending: false})

                    let matchingSession = null
                    const duplicates = []

                    if (existingSessions && existingSessions.length > 0) {
                        const sessionsByDevice = {}

                        for (const session of existingSessions) {
                            const key = `${session.browser}_${session.os}_${session.device}`

                            if (session.browser === currentBrowser &&
                                session.os === currentOS &&
                                session.device === currentDevice) {
                                if (!matchingSession) {
                                    matchingSession = session
                                } else {
                                    duplicates.push(session.id)
                                }
                            }

                            if (sessionsByDevice[key]) {
                                duplicates.push(session.id)
                            } else {
                                sessionsByDevice[key] = session
                            }
                        }

                        if (duplicates.length > 0) {
                            try {
                                await supabase
                                    .from('users_sessions')
                                    .delete()
                                    .in('id', duplicates)
                            } catch (err) {
                                console.error('Failed to remove duplicate sessions:', err)
                            }
                        }
                    }

                    let currentSessId
                    if (matchingSession) {
                        currentSessId = matchingSession.id
                        sessionStorage.setItem('sessionId', currentSessId)

                        try {
                            await supabase.from('users_sessions')
                                .update({last_active: new Date().toISOString()})
                                .eq('id', currentSessId)
                        } catch (err) {
                            console.error('Failed to update session:', err)
                        }
                    } else {
                        currentSessId = `${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        sessionStorage.setItem('sessionId', currentSessId)

                        try {
                            await supabase.from('users_sessions').upsert({
                                id: currentSessId,
                                user_id: uid,
                                browser: currentBrowser,
                                os: currentOS,
                                device: currentDevice,
                                user_agent: userAgent,
                                last_active: new Date().toISOString(),
                                created_at: new Date().toISOString()
                            }, {onConflict: 'id'})
                        } catch (err) {
                            console.error('Failed to create session:', err)
                        }
                    }

                    setCurrentSessionId(currentSessId)

                    const {data: userSessions} = await supabase
                        .from('users_sessions')
                        .select('*')
                        .eq('user_id', uid)
                        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                        .order('last_active', {ascending: false})
                        .limit(10)

                    if (userSessions && userSessions.length > 0) {
                        const sessionsList = userSessions.map(s => ({
                            id: s.id,
                            createdAt: s.created_at,
                            lastActive: s.last_active,
                            browser: s.browser,
                            os: s.os,
                            device: s.device,
                            isCurrent: s.id === currentSessId
                        }))
                        setSessions(sessionsList)
                    }
                }
            } catch (e) {
                if (!cancelled) setMessage(`Error: ${e.message}`)
            } finally {
                if (!cancelled) {
                    setRegionsLoaded(true);
                    setLoading(false)
                }
            }
        }

        load();
        return () => {
            cancelled = true
        }
    }, [userId])

    const updateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('')
        try {
            const uid = userId || sessionStorage.getItem('userId')
            if (!uid) {
                const {data: {session}, error: sessionError} = await supabase.auth.getSession();
                if (sessionError || !session) throw new Error('No active session or user ID')
                const {error: pe} = await supabase.from('users_profiles').update({
                    first_name: firstName,
                    last_name: lastName,
                    updated_at: new Date().toISOString()
                }).eq('id', session.user.id)
                if (pe) throw pe
            } else {
                const {error: pe} = await supabase.from('users_profiles').update({
                    first_name: firstName,
                    lastName: lastName,
                    updated_at: new Date().toISOString()
                }).eq('id', uid)
                if (pe) throw pe
            }
            setMessage('Profile updated successfully!')
        } catch (err) {
            setMessage(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const updatePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setPasswordError('');
        setMessage('')
        try {
            if (!currentPassword) throw new Error('Current password is required')
            if (newPassword !== confirmPassword) throw new Error('New passwords do not match')
            if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
            const {
                data: userData,
                error: userError
            } = await supabase.from('users').select('id, email, password_hash, salt').eq('email', email).single()
            if (userError || !userData) throw new Error('Could not verify current password')
            const {AuthUtility} = await import('../../utils/AuthUtility')
            const computedHash = await AuthUtility.hashPassword(currentPassword, userData.salt)
            if (computedHash !== userData.password_hash) throw new Error('Current password is incorrect')
            const salt = await AuthUtility.generateSalt()
            if (typeof salt !== 'string' || salt.length !== 32 || !/^[0-9a-f]{32}$/i.test(salt)) throw new Error('Failed to generate valid salt')
            const newPasswordHash = await AuthUtility.hashPassword(newPassword, salt)
            const {error: updateError} = await supabase.from('users').update({
                password_hash: newPasswordHash,
                salt,
                updated_at: new Date().toISOString()
            }).eq('id', userData.id)
            if (updateError) throw updateError
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(false)
            await AuthService.signOut();
            try {
                await supabase.auth.signOut()
            } catch {
            }
            sessionStorage.removeItem('userId');
            window.location.href = '/login'
        } catch (err) {
            setPasswordError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        setLoading(true)
        try {
            const sessionId = sessionStorage.getItem('sessionId')
            if (sessionId) {
                try {
                    await supabase
                        .from('users_sessions')
                        .delete()
                        .eq('id', sessionId)
                } catch (err) {
                    console.error('Failed to delete session:', err)
                }
            }

            await AuthService.signOut();
            await supabase.auth.signOut();
            sessionStorage.removeItem('userId');
            sessionStorage.removeItem('sessionId');
            window.location.href = '/'
        } catch (err) {
            setMessage(`Error signing out: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleChangeRegion = (e) => {
        const code = e.target.value
        if (!code) {
            updatePreferences('selectedRegion', {code: '', name: '', type: ''});
            setRegionName('');
            return
        }
        const r = permittedRegions.find(x => (x.regionCode || x.region_code) === code);
        if (!r) return
        const name = r.regionName || r.region_name || '';
        const type = r.type || r.region_type || ''
        updatePreferences('selectedRegion', {code, name, type});
        setRegionName(name)
    }

    const styles = {
        wrapper: {
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            background: '#f8fafc',
            padding: '0'
        },
        container: {
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '2rem'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '350px 1fr',
            gap: '2rem',
            alignItems: 'start'
        },
        sidebar: {
            position: 'sticky',
            top: '2rem'
        },
        profileCard: {
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            marginBottom: '1.5rem'
        },
        avatar: {
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: '#1e3a5f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'white',
            margin: '0 auto 1.5rem',
            border: '4px solid #f1f5f9'
        },
        name: {
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            textAlign: 'center',
            marginBottom: '0.5rem'
        },
        email: {
            fontSize: '0.875rem',
            color: '#64748b',
            textAlign: 'center',
            marginBottom: '1.5rem'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1.5rem'
        },
        statItem: {
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            textAlign: 'center'
        },
        statLabel: {
            fontSize: '0.75rem',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '0.25rem',
            fontWeight: 600
        },
        statValue: {
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#1e3a5f'
        },
        navCard: {
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
        },
        navItem: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            cursor: 'pointer',
            background: active ? '#f0f7ff' : 'white',
            borderLeft: active ? '4px solid #1e3a5f' : '4px solid transparent',
            transition: 'all 0.2s ease',
            color: active ? '#1e3a5f' : '#64748b',
            fontWeight: active ? 600 : 500,
            fontSize: '0.9375rem'
        }),
        navIcon: {
            fontSize: '1.125rem',
            width: '24px',
            textAlign: 'center'
        },
        mainContent: {
            minHeight: '600px'
        },
        contentCard: {
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            marginBottom: '1.5rem'
        },
        sectionTitle: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        },
        sectionDescription: {
            fontSize: '0.875rem',
            color: '#64748b',
            marginBottom: '2rem'
        },
        formRow: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem'
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        label: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#374151'
        },
        input: {
            width: '100%',
            padding: '0.75rem 1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            color: '#1e293b',
            transition: 'all 0.2s ease',
            outline: 'none',
            background: 'white'
        },
        button: (variant = 'primary', disabled = false) => ({
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
            background: variant === 'primary' ? '#1e3a5f' : 
                        variant === 'danger' ? '#ef4444' : '#f1f5f9',
            color: variant === 'primary' || variant === 'danger' ? 'white' : '#64748b',
            opacity: disabled ? 0.6 : 1
        }),
        infoList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9'
        },
        infoLabel: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        infoValue: {
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#1e293b'
        },
        sessionsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        sessionItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
        },
        sessionInfo: {
            flex: 1
        },
        sessionBrowser: {
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '0.25rem'
        },
        sessionDetails: {
            fontSize: '0.8125rem',
            color: '#64748b'
        },
        currentBadge: {
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            background: '#dcfce7',
            color: '#16a34a',
            fontSize: '0.75rem',
            fontWeight: 600
        },
        revokeButton: {
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            background: '#fef2f2',
            color: '#ef4444',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        actionCard: {
            padding: '1.5rem',
            background: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        actionContent: {
            flex: 1
        },
        actionTitle: {
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '0.25rem'
        },
        actionDescription: {
            fontSize: '0.875rem',
            color: '#64748b'
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
        },
        modalContent: {
            background: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        modalHeader: {
            padding: '1.5rem 2rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        modalTitle: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        },
        modalBody: {
            padding: '2rem'
        },
        message: (type) => ({
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: type === 'error' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${type === 'error' ? '#fee2e2' : '#dcfce7'}`,
            color: type === 'error' ? '#dc2626' : '#16a34a',
            fontSize: '0.875rem'
        }),
        skeleton: {
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
            borderRadius: '8px'
        }
    };

    useEffect(() => {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(styleSheet);
        return () => document.head.removeChild(styleSheet);
    }, []);

    const renderSkeleton = () => (
        <div style={styles.wrapper}>
            <div style={styles.container}>
                <div style={styles.grid}>
                    <div style={styles.sidebar}>
                        <div style={styles.profileCard}>
                            <div style={{...styles.avatar, ...styles.skeleton}}></div>
                            <div style={{...styles.skeleton, height: '24px', marginBottom: '0.5rem'}}></div>
                            <div style={{...styles.skeleton, height: '16px', marginBottom: '1.5rem', maxWidth: '200px', margin: '0 auto 1.5rem'}}></div>
                            <div style={styles.statsGrid}>
                                <div style={{...styles.skeleton, height: '60px'}}></div>
                                <div style={{...styles.skeleton, height: '60px'}}></div>
                            </div>
                        </div>
                        <div style={styles.navCard}>
                            <div style={{...styles.skeleton, height: '48px', marginBottom: '0.5rem'}}></div>
                            <div style={{...styles.skeleton, height: '48px'}}></div>
                        </div>
                    </div>
                    <div style={styles.mainContent}>
                        <div style={styles.contentCard}>
                            <div style={{...styles.skeleton, height: '300px'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div style={styles.wrapper}>
            {loading ? renderSkeleton() : (
                <div style={styles.container}>
                    {message && (
                        <div style={styles.message(message.includes('Error') ? 'error' : 'success')}>
                            <i className={`fas fa-${message.includes('Error') ? 'exclamation-circle' : 'check-circle'}`}></i>
                            <span style={{flex: 1}}>{message}</span>
                            <button 
                                onClick={() => setMessage('')}
                                style={{background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem'}}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    <div style={styles.grid}>
                        <div style={styles.sidebar}>
                            <div style={styles.profileCard}>
                                <div style={styles.avatar}>
                                    {firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() :
                                        <i className="fas fa-user"></i>}
                                </div>
                                <h1 style={styles.name}>
                                    {(firstName || lastName) ? `${firstName || ''} ${lastName || ''}`.trim() : 'My Account'}
                                </h1>
                                <p style={styles.email}>{email || 'No email available'}</p>
                                <div style={styles.statsGrid}>
                                    <div style={styles.statItem}>
                                        <div style={styles.statLabel}>Role</div>
                                        <div style={styles.statValue}>{userRole || 'N/A'}</div>
                                    </div>
                                    <div style={styles.statItem}>
                                        <div style={styles.statLabel}>Sessions</div>
                                        <div style={styles.statValue}>{sessions.length}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.navCard}>
                                <div 
                                    style={styles.navItem(activeTab === 'profile')}
                                    onClick={() => setActiveTab('profile')}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== 'profile') e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== 'profile') e.currentTarget.style.background = 'white';
                                    }}
                                >
                                    <i className="fas fa-user" style={styles.navIcon}></i>
                                    Profile Settings
                                </div>
                                <div 
                                    style={styles.navItem(activeTab === 'security')}
                                    onClick={() => setActiveTab('security')}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== 'security') e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== 'security') e.currentTarget.style.background = 'white';
                                    }}
                                >
                                    <i className="fas fa-shield-alt" style={styles.navIcon}></i>
                                    Security
                                </div>
                            </div>
                        </div>

                        <div style={styles.mainContent}>
                            {activeTab === 'profile' && (
                                <>
                                    <div style={styles.contentCard}>
                                        <h2 style={styles.sectionTitle}>
                                            <i className="fas fa-id-card" style={{color: '#1e3a5f'}}></i>
                                            Personal Information
                                        </h2>
                                        <p style={styles.sectionDescription}>
                                            Update your personal details and contact information
                                        </p>
                                        <form onSubmit={updateProfile}>
                                            <div style={styles.formRow}>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.label} htmlFor="first_name">First Name</label>
                                                    <input
                                                        type="text"
                                                        id="first_name"
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        placeholder="Enter first name"
                                                        required
                                                        style={styles.input}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = '#1e3a5f';
                                                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.borderColor = '#e5e7eb';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                </div>
                                                <div style={styles.formGroup}>
                                                    <label style={styles.label} htmlFor="last_name">Last Name</label>
                                                    <input
                                                        type="text"
                                                        id="last_name"
                                                        value={lastName}
                                                        onChange={(e) => setLastName(e.target.value)}
                                                        placeholder="Enter last name"
                                                        required
                                                        style={styles.input}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = '#1e3a5f';
                                                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.borderColor = '#e5e7eb';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                type="submit" 
                                                style={styles.button('primary', loading)}
                                                disabled={loading}
                                                onMouseEnter={(e) => {
                                                    if (!loading) {
                                                        e.currentTarget.style.background = '#163352';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!loading) {
                                                        e.currentTarget.style.background = '#1e3a5f';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }
                                                }}
                                            >
                                                <i className="fas fa-save"></i>
                                                Save Changes
                                            </button>
                                        </form>
                                    </div>

                                    <div style={styles.contentCard}>
                                        <h2 style={styles.sectionTitle}>
                                            <i className="fas fa-info-circle" style={{color: '#1e3a5f'}}></i>
                                            Account Information
                                        </h2>
                                        <p style={styles.sectionDescription}>
                                            View your account details and preferences
                                        </p>
                                        <div style={styles.infoList}>
                                            <div style={styles.infoRow}>
                                                <div style={styles.infoLabel}>
                                                    <i className="fas fa-envelope"></i>
                                                    Email Address
                                                </div>
                                                <div style={styles.infoValue}>{email || 'Not available'}</div>
                                            </div>
                                            {userRole && (
                                                <div style={styles.infoRow}>
                                                    <div style={styles.infoLabel}>
                                                        <i className="fas fa-user-tag"></i>
                                                        Role
                                                    </div>
                                                    <div style={styles.infoValue}>{userRole}</div>
                                                </div>
                                            )}
                                            <div style={styles.infoRow}>
                                                <div style={styles.infoLabel}>
                                                    <i className="fas fa-globe"></i>
                                                    Region
                                                </div>
                                                <select
                                                    value={preferences.selectedRegion?.code || ''}
                                                    onChange={handleChangeRegion}
                                                    disabled={!regionsLoaded}
                                                    style={{
                                                        ...styles.input,
                                                        padding: '0.5rem 1rem',
                                                        cursor: 'pointer',
                                                        maxWidth: '300px'
                                                    }}
                                                >
                                                    {permittedRegions.map(r => (
                                                        <option key={r.regionCode || r.region_code} value={r.regionCode || r.region_code}>
                                                            {r.regionName || r.region_name || ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {plantCode && (
                                                <div style={styles.infoRow}>
                                                    <div style={styles.infoLabel}>
                                                        <i className="fas fa-building"></i>
                                                        Plant Code
                                                    </div>
                                                    <div style={styles.infoValue}>{plantCode}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'security' && (
                                <>
                                    <div style={styles.contentCard}>
                                        <h2 style={styles.sectionTitle}>
                                            <i className="fas fa-key" style={{color: '#1e3a5f'}}></i>
                                            Password Security
                                        </h2>
                                        <p style={styles.sectionDescription}>
                                            Keep your account secure by changing your password regularly
                                        </p>
                                        <button
                                            onClick={() => setShowPasswordModal(true)}
                                            style={styles.button('primary')}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#163352';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#1e3a5f';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <i className="fas fa-lock"></i>
                                            Change Password
                                        </button>
                                    </div>

                                    <div style={styles.contentCard}>
                                        <h2 style={styles.sectionTitle}>
                                            <i className="fas fa-laptop" style={{color: '#1e3a5f'}}></i>
                                            Active Sessions
                                        </h2>
                                        <p style={styles.sectionDescription}>
                                            Manage your active login sessions across all devices
                                        </p>
                                        <div style={styles.sessionsList}>
                                            {sessions.length > 0 ? sessions.map(session => (
                                                <div key={session.id} style={styles.sessionItem}>
                                                    <div style={styles.sessionInfo}>
                                                        <div style={styles.sessionBrowser}>
                                                            <i className={`fas fa-${session.device === 'Mobile' ? 'mobile-alt' : session.device === 'Tablet' ? 'tablet-alt' : 'desktop'}`} 
                                                               style={{marginRight: '0.5rem', color: '#1e3a5f'}}></i>
                                                            {session.browser}
                                                        </div>
                                                        <div style={styles.sessionDetails}>
                                                            {session.os} • {session.device} • {formatSessionTime(session.lastActive)}
                                                        </div>
                                                    </div>
                                                    {session.isCurrent ? (
                                                        <div style={styles.currentBadge}>
                                                            <i className="fas fa-check-circle" style={{marginRight: '0.25rem'}}></i>
                                                            Current
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            style={styles.revokeButton}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#fee2e2';
                                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#fef2f2';
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                            }}
                                                        >
                                                            <i className="fas fa-times" style={{marginRight: '0.25rem'}}></i>
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            )) : (
                                                <p style={{textAlign: 'center', color: '#94a3b8', padding: '2rem'}}>
                                                    No active sessions found
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={styles.contentCard}>
                                        <h2 style={styles.sectionTitle}>
                                            <i className="fas fa-sign-out-alt" style={{color: '#ef4444'}}></i>
                                            Sign Out
                                        </h2>
                                        <p style={styles.sectionDescription}>
                                            Sign out from your account and end your current session
                                        </p>
                                        <div style={styles.actionCard}>
                                            <div style={styles.actionContent}>
                                                <div style={styles.actionTitle}>Sign out of your account</div>
                                                <div style={styles.actionDescription}>
                                                    This will end your current session and require you to sign in again
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleSignOut}
                                                style={styles.button('danger')}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#dc2626';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#ef4444';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <i className="fas fa-sign-out-alt"></i>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showPasswordModal && !loading && (
                <div style={styles.modal} onClick={() => setShowPasswordModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                <i className="fas fa-key" style={{color: '#1e3a5f'}}></i>
                                Change Password
                            </h3>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.25rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.color = '#1e293b';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            {passwordError && (
                                <div style={styles.message('error')}>
                                    <i className="fas fa-exclamation-circle"></i>
                                    <span>{passwordError}</span>
                                </div>
                            )}
                            <form onSubmit={updatePassword}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label} htmlFor="current_password">Current Password</label>
                                    <input
                                        type="password"
                                        id="current_password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        required
                                        style={styles.input}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#1e3a5f';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                                <div style={{...styles.formGroup, marginTop: '1rem'}}>
                                    <label style={styles.label} htmlFor="new_password">New Password</label>
                                    <input
                                        type="password"
                                        id="new_password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        required
                                        style={styles.input}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#1e3a5f';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                    <small style={{fontSize: '0.75rem', color: '#64748b'}}>
                                        Must be at least 8 characters long
                                    </small>
                                </div>
                                <div style={{...styles.formGroup, marginTop: '1rem'}}>
                                    <label style={styles.label} htmlFor="confirm_password">Confirm Password</label>
                                    <input
                                        type="password"
                                        id="confirm_password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        required
                                        style={styles.input}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#1e3a5f';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e5e7eb';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                                <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        style={{
                                            ...styles.button('secondary'),
                                            flex: 1
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#e2e8f0';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#f1f5f9';
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                                        style={{
                                            ...styles.button('primary', loading || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8),
                                            flex: 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading && currentPassword && newPassword === confirmPassword && newPassword.length >= 8) {
                                                e.currentTarget.style.background = '#163352';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!loading && currentPassword && newPassword === confirmPassword && newPassword.length >= 8) {
                                                e.currentTarget.style.background = '#1e3a5f';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        <i className="fas fa-check"></i>
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyAccountView