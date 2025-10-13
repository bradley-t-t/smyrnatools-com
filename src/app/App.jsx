import React, {useEffect, useState} from 'react';
import {Navigate, Route, Routes, useLocation} from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import AppLayout from './components/layout/AppLayout';
import OperatorsPage from './pages/operators/OperatorsPage';
import TrainingHistoryPage from './pages/operators/TrainingHistoryPage';
import TasksPage from './pages/tasks/TasksPage';
import SettingsPage from './pages/settings/SettingsPage';
import RegistrationPage from './pages/auth/RegistrationPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MyAccountPage from './pages/account/MyAccountPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import {PreferencesProvider} from './context/PreferencesContext';
import {AccountProvider} from './context/AccountContext';
import ListView from '../components/pages/list/ListView';
import GuestOverlay from '../components/common/GuestOverlay';
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
    const [hasPlant, setHasPlant] = useState(false)
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
            if (!user) return
            try {
                const plant = await UserService.getUserPlant(user.id)
                const plantCode = (typeof plant === 'string' ? plant : (plant?.plant_code || plant?.plantCode || '')).trim()
                if (active) setHasPlant(!!plantCode)
            } catch {
                if (active) setHasPlant(false)
            }
        }
        if (user) checkPlant()
        const interval = setInterval(() => {
            if (user) checkPlant()
        }, 60000)
        return () => {
            clearInterval(interval)
            active = false
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
        const showOverlay = isAuthenticated && hasPlant === false && location.pathname !== '/guest'
        document.body.style.overflow = showOverlay ? 'hidden' : 'auto'
        document.body.style.pointerEvents = showOverlay ? 'none' : 'auto'
    }, [isAuthenticated, hasPlant, location.pathname])

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
                    <Route path="/guest" element={<GuestOverlay/>}/>
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
                {isAuthenticated && hasPlant === false && location.pathname !== '/guest' && <GuestOverlay reason="no-plant" />}
            </AccountProvider>
        </PreferencesProvider>
    );
}

export default App;
