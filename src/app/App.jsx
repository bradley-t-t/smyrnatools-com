import React, {useEffect, useState} from 'react';
import {Navigate, Route, Routes, useLocation} from 'react-router-dom';
import './App.css';
import HomePage from './views/HomePage';
import LoginPage from './views/auth/LoginPage';
import AppLayout from './components/layout/AppLayout';
import OperatorsPage from './views/operators/OperatorsPage';
import TrainingHistoryPage from './views/operators/TrainingHistoryPage';
import TasksPage from './views/tasks/TasksPage';
import SettingsPage from './views/settings/SettingsPage';
import RegistrationPage from './views/auth/RegistrationPage';
import ForgotPasswordPage from './views/auth/ForgotPasswordPage';
import ResetPasswordPage from './views/auth/ResetPasswordPage';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MyAccountPage from './views/account/MyAccountPage';
import VerifyEmailPage from './views/auth/VerifyEmailPage';
import {PreferencesProvider} from './context/PreferencesContext';
import {AccountProvider} from './context/AccountContext';
import ListView from '../views/list/ListView';
import LockedOverlay from '../components/common/LockedOverlay';
import TerminatedOverlay from '../components/common/TerminatedOverlay';
import DesktopOnlyOverlay from '../components/common/DesktopOnlyOverlay';
import OfflineOverlay from '../components/common/OfflineOverlay'
import {NetworkUtility} from '../utils/NetworkUtility'
import {useAuth} from './context/AuthContext';
import {UserService} from '../services/UserService'

function App() {
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isBot = /bot|crawl|spider|googlebot|bingbot|yandexbot/i.test(navigator.userAgent);
    const [offlineMode, setOfflineMode] = useState(false)
    const {user, isAuthenticated} = useAuth()
    const [hasPlant, setHasPlant] = useState(null)
    const [plantLoading, setPlantLoading] = useState(true)
    const [isTerminated, setIsTerminated] = useState(false)
    const [rolesChecked, setRolesChecked] = useState(false)
    const location = useLocation()

    useEffect(() => {
        let intervalId
        const check = async () => {
            const ok = await NetworkUtility.checkConnection()
            setOfflineMode(!ok)
        }
        const handleOnline = () => {
            check()
        }
        const handleOffline = () => {
            setOfflineMode(true)
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        check()
        intervalId = setInterval(() => {
            check()
        }, 10000)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            if (intervalId) clearInterval(intervalId)
        }
    }, [])

    useEffect(() => {
        let active = true

        async function checkPlant() {
            if (!user) {
                if (active) {
                    setPlantLoading(false)
                    setHasPlant(false)
                }
                return
            }

            setPlantLoading(true)
            try {
                const currentUser = await UserService.getCurrentUser()
                if (!currentUser || !currentUser.id) {
                    if (active) {
                        setPlantLoading(false)
                    }
                    return
                }

                const plant = await UserService.getUserPlant(currentUser.id)
                const plantCode = (typeof plant === 'string' ? plant : (plant?.plant_code || plant?.plantCode || '')).trim()
                if (active) {
                    setHasPlant(!!plantCode)
                    setPlantLoading(false)
                }
            } catch (error) {
                if (active) {
                    setPlantLoading(false)
                }
            }
        }

        if (user) {
            checkPlant()
        } else {
            setPlantLoading(false)
            setHasPlant(false)
        }

        const interval = setInterval(() => {
            if (user && !plantLoading) checkPlant()
        }, 60000)
        return () => {
            clearInterval(interval)
            active = false
        }
    }, [user, plantLoading])

    useEffect(() => {
        let active = true
        let intervalId

        async function checkTerminated() {
            if (!user) {
                if (active) {
                    setIsTerminated(false)
                    setRolesChecked(true)
                }
                return
            }
            try {
                UserService.userRolesCache.delete(user.id)
                const roles = await UserService.getUserRoles(user.id)

                const hasTerminated = roles && roles.some(r => {
                    const roleName = (r?.name || '').toLowerCase()
                    const isMatch = roleName === 'terminated'
                    return isMatch
                })
                if (active) {
                    setIsTerminated(hasTerminated)
                    setRolesChecked(true)
                }
            } catch (error) {
                console.error('[TerminatedCheck] Error checking roles:', error)
                if (active) {
                    setIsTerminated(false)
                    setRolesChecked(true)
                }
            }
        }

        checkTerminated()
        intervalId = setInterval(() => {
            if (user) checkTerminated()
        }, 30000)

        return () => {
            active = false
            if (intervalId) clearInterval(intervalId)
        }
    }, [user])

    const handleRetryConnection = async () => {
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            setOfflineMode(false)
            window.location.reload()
        }
    }

    const handleReloadIfOnline = async () => {
        const ok = await NetworkUtility.checkConnection()
        if (ok) {
            setOfflineMode(false)
            window.location.reload()
        }
    }

    useEffect(() => {
        const showOverlay = (isAuthenticated && !plantLoading && hasPlant === false && location.pathname !== '/guest') || isTerminated
        document.body.style.overflow = showOverlay ? 'hidden' : 'auto'
        document.body.style.pointerEvents = showOverlay ? 'none' : 'auto'
    }, [isAuthenticated, hasPlant, plantLoading, location.pathname, isTerminated])

    if (isMobile && !isBot) return (
        <PreferencesProvider>
            <AccountProvider>
                <DesktopOnlyOverlay/>
            </AccountProvider>
        </PreferencesProvider>
    );

    if (offlineMode) return (
        <PreferencesProvider>
            <AccountProvider>
                <OfflineOverlay onRetry={handleRetryConnection} onReload={handleReloadIfOnline}/>
            </AccountProvider>
        </PreferencesProvider>
    )

    if (isAuthenticated && !rolesChecked) {
        return null
    }

    if (isTerminated) {
        return (
            <PreferencesProvider>
                <AccountProvider>
                    <TerminatedOverlay/>
                </AccountProvider>
            </PreferencesProvider>
        )
    }

    return (
        <PreferencesProvider>
            <AccountProvider>
                <Routes>
                    <Route element={<AuthLayout/>}>
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route path="/register" element={<RegistrationPage/>}/>
                        <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
                        <Route path="/reset-password" element={<ResetPasswordPage/>}/>
                        <Route path="/verify-email" element={<VerifyEmailPage/>}/>
                    </Route>
                    <Route path="/guest" element={<LockedOverlay/>}/>
                    <Route element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>
                        <Route path="/" element={<HomePage/>}/>
                        <Route path="/operators" element={<OperatorsPage/>}/>
                        <Route path="/operators/training" element={<TrainingHistoryPage/>}/>
                        <Route path="/tasks" element={<TasksPage/>}/>
                        <Route path="/settings" element={<SettingsPage/>}/>
                        <Route path="/account" element={<MyAccountPage/>}/>
                        <Route path="/list" element={<ListView/>}/>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
                {isAuthenticated && !plantLoading && hasPlant === false && location.pathname !== '/guest' &&
                    <LockedOverlay reason="no-plant"/>}
            </AccountProvider>
        </PreferencesProvider>
    );
}

export default App;
