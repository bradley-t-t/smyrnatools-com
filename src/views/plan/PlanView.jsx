import React, { useEffect, useState } from 'react'

import { PlanService } from '../../services/PlanService'
import { ReportService } from '../../services/ReportService'
import { UserService } from '../../services/UserService'

const PRE_TRIP_MINUTES = 15
const BUFFER_MINUTES = 5

function PlanView() {
    const [plants, setPlants] = useState([])
    const [mixerCountsByPlant, setMixerCountsByPlant] = useState({})
    const [assignments, setAssignments] = useState([
        {
            driverCount: 1,
            fromPlant: '',
            hurryOffClock: false,
            id: Date.now(),
            operatorTimes: [],
            returnTime: '',
            staggerMinutes: 10,
            time: '',
            toPlant: '',
            useIndividualTimes: false
        },
        {
            driverCount: 1,
            fromPlant: '',
            hurryOffClock: false,
            id: Date.now() + 1,
            operatorTimes: [],
            returnTime: '',
            staggerMinutes: 10,
            time: '',
            toPlant: '',
            useIndividualTimes: false
        }
    ])
    const [generatedMessage, setGeneratedMessage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [notes, setNotes] = useState('')
    const [planDate, setPlanDate] = useState(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    })
    const [canEditTravelTimes, setCanEditTravelTimes] = useState(false)
    const [showTravelConfig, setShowTravelConfig] = useState(false)
    const [travelTimes, setTravelTimes] = useState({})
    const [editingTravelTime, setEditingTravelTime] = useState(null)
    const [newTravelTime, setNewTravelTime] = useState({ from: '', minutes: '', to: '' })
    const [isSaving, setIsSaving] = useState(false)
    const [sidebarMinimized, setSidebarMinimized] = useState(false)
    const [userId, setUserId] = useState(null)
    const [isLoadingPlan, setIsLoadingPlan] = useState(true)

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const styles = {
        view: {
            background: '#f8fafc',
            height: '100%',
            overflowY: 'auto',
            padding: isMobile ? '1rem' : '2rem',
            width: '100%'
        },
        content: (sidebarExpanded) => ({
            margin: '0 auto',
            maxWidth: '1400px',
            paddingLeft: !isMobile && sidebarExpanded ? '140px' : '0',
            transition: 'padding-left 0.2s ease'
        }),
        header: {
            background: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundPosition: '0 0, 0 0, 0 0',
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: isMobile ? '1rem' : '2rem',
            overflow: 'hidden',
            padding: isMobile ? '1rem' : '2rem'
        },
        titleRow: {
            alignItems: isMobile ? 'flex-start' : 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '0',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
        },
        title: {
            color: '#1e293b',
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            fontWeight: 700,
            margin: 0
        },
        headerActions: {
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            width: isMobile ? '100%' : 'auto'
        },
        dateInput: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e3a5f',
            cursor: 'pointer',
            flex: isMobile ? '1 1 100%' : 'none',
            fontSize: '0.9375rem',
            fontWeight: 600,
            outline: 'none',
            padding: '0.5rem 1rem'
        },
        actionBtn: (active) => ({
            alignItems: 'center',
            background: active ? '#1e3a5f' : 'white',
            border: active ? '1px solid #1e3a5f' : '1px solid #e5e7eb',
            borderRadius: '8px',
            color: active ? 'white' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            flex: isMobile ? '1 1 auto' : 'none',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            fontWeight: 500,
            gap: '0.5rem',
            outline: 'none',
            padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
            transition: 'all 0.2s'
        }),
        newPlanBtn: {
            alignItems: 'center',
            background: '#1e3a5f',
            border: '1px solid #1e3a5f',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flex: isMobile ? '1 1 auto' : 'none',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            fontWeight: 500,
            gap: '0.5rem',
            outline: 'none',
            padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
            transition: 'all 0.2s'
        },
        dangerBtn: {
            alignItems: 'center',
            background: 'white',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            flex: isMobile ? '1 1 auto' : 'none',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            fontWeight: 500,
            gap: '0.5rem',
            outline: 'none',
            padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
            transition: 'all 0.2s'
        },
        mixerCountsRow: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: isMobile ? '1rem' : '0'
        },
        mixerBadge: {
            alignItems: 'center',
            background: '#f1f5f9',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem'
        },
        mixerBadgePlant: {
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        mixerBadgeCount: {
            color: '#1e3a5f',
            fontSize: '0.9375rem',
            fontWeight: 700
        },
        allocationSidebar: (minimized) => ({
            background: 'white',
            border: '1px solid #e5e7eb',
            borderLeft: 'none',
            borderRadius: '0 12px 12px 0',
            boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
            display: isMobile ? 'none' : 'flex',
            flexDirection: 'column',
            left: 0,
            padding: minimized ? '0.75rem 0.5rem' : '1rem',
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            transition: 'all 0.2s ease',
            zIndex: 100
        }),
        allocationSidebarHeader: {
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            paddingBottom: '0.75rem'
        },
        allocationSidebarTitle: {
            color: '#1e3a5f',
            fontSize: '0.75rem',
            fontWeight: 600
        },
        allocationMinBtn: {
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.75rem',
            justifyContent: 'center',
            padding: '0.25rem'
        },
        allocationContent: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        allocationBarItem: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.5rem'
        },
        allocationBarLabel: {
            color: '#475569',
            fontSize: '0.6875rem',
            fontWeight: 600,
            textAlign: 'right',
            width: '28px'
        },
        allocationBarTrack: {
            background: '#f1f5f9',
            borderRadius: '4px',
            height: '20px',
            overflow: 'hidden',
            position: 'relative',
            width: '80px'
        },
        allocationBarFill: (percent) => ({
            background: percent > 100 ? '#22c55e' : percent < 100 ? '#f59e0b' : '#1e3a5f',
            borderRadius: '4px',
            height: '100%',
            transition: 'width 0.3s ease',
            width: `${Math.min(Math.max(percent, 0), 200) / 2}%`
        }),
        allocationBarPercent: (percent) => ({
            color: percent > 100 ? '#16a34a' : percent < 100 ? '#d97706' : '#1e3a5f',
            fontSize: '0.6875rem',
            fontWeight: 600,
            minWidth: '32px',
            textAlign: 'left'
        }),
        allocationMinimizedIcon: {
            color: '#1e3a5f',
            fontSize: '1rem'
        },
        mobileAllocationCard: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: isMobile ? 'block' : 'none',
            marginBottom: '1rem',
            padding: '1rem'
        },
        mobileAllocationTitle: {
            color: '#1e3a5f',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.75rem'
        },
        mobileAllocationGrid: {
            display: 'grid',
            gap: '0.5rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))'
        },
        mobileAllocationItem: {
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '6px',
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem'
        },
        configCard: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: isMobile ? '1rem' : '2rem',
            padding: isMobile ? '1rem' : '1.5rem'
        },
        configHeader: {
            alignItems: 'center',
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem'
        },
        configTitle: {
            color: '#1e293b',
            fontSize: '1rem',
            fontWeight: 600
        },
        configSub: {
            color: '#94a3b8',
            fontSize: '0.8125rem'
        },
        configForm: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: '0.5rem'
        },
        configSelect: {
            appearance: 'none',
            background: 'white',
            backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '0.875rem',
            outline: 'none',
            padding: '0.625rem 2rem 0.625rem 1rem',
            width: isMobile ? '100%' : '100px'
        },
        configArrow: {
            color: '#94a3b8',
            display: isMobile ? 'none' : 'block',
            fontSize: '0.875rem'
        },
        configMinInput: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.875rem',
            outline: 'none',
            padding: '0.625rem',
            textAlign: 'center',
            width: isMobile ? '100%' : '70px'
        },
        configAddBtn: {
            alignItems: 'center',
            background: '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            height: '38px',
            justifyContent: 'center',
            width: isMobile ? '100%' : '38px'
        },
        configList: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '1rem'
        },
        configItem: {
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem'
        },
        configRoute: {
            color: '#475569',
            fontSize: '0.875rem',
            fontWeight: 500
        },
        configTime: {
            borderBottom: '1px dashed #94a3b8',
            color: '#1e3a5f',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600
        },
        configEditInput: {
            border: '1px solid #1e3a5f',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            padding: '0.25rem',
            textAlign: 'center',
            width: '45px'
        },
        configDelBtn: {
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.75rem',
            padding: '0.25rem'
        },
        mainGrid: {
            display: 'grid',
            gap: isMobile ? '1rem' : '2rem',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
        },
        section: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        sectionHeader: {
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between'
        },
        sectionTitle: {
            color: '#1e293b',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: 600
        },
        addBtn: {
            alignItems: 'center',
            background: '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.625rem 1.25rem'
        },
        empty: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '3rem 2rem',
            textAlign: 'center'
        },
        emptyIcon: {
            color: '#cbd5e1',
            fontSize: '2.5rem',
            marginBottom: '1rem'
        },
        emptyText: {
            color: '#64748b',
            fontSize: '1rem',
            fontWeight: 500
        },
        list: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        card: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: isMobile ? '8px' : '12px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            padding: isMobile ? '1rem' : '1.5rem'
        },
        cardHeader: {
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1rem'
        },
        cardNum: {
            background: '#f1f5f9',
            borderRadius: '6px',
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.375rem 0.625rem'
        },
        cardDel: {
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.375rem',
            transition: 'all 0.2s'
        },
        cardRow: {
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)'
        },
        field: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem'
        },
        fieldLabel: {
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        fieldSelect: {
            appearance: 'none',
            background: 'white',
            backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
            backgroundPosition: 'right 0.75rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            outline: 'none',
            padding: '0.625rem 2rem 0.625rem 0.75rem',
            width: '100%'
        },
        fieldInput: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.9375rem',
            outline: 'none',
            padding: '0.625rem 0.75rem',
            width: '100%'
        },
        fieldInputSm: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.9375rem',
            outline: 'none',
            padding: '0.625rem 0.75rem',
            textAlign: 'center',
            width: '100%'
        },
        warning: {
            alignItems: 'center',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#92400e',
            display: 'flex',
            fontSize: '0.8125rem',
            fontWeight: 500,
            gap: '0.5rem',
            marginTop: '1rem',
            padding: '0.75rem 1rem'
        },
        stagger: {
            alignItems: 'center',
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '8px',
            display: 'flex',
            gap: '0.75rem',
            marginTop: '1rem',
            padding: '0.75rem 1rem'
        },
        staggerLabel: {
            alignItems: 'center',
            color: '#1e3a5f',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 500,
            gap: '0.5rem'
        },
        staggerInput: {
            border: '1px solid #dbeafe',
            borderRadius: '6px',
            color: '#1e3a5f',
            fontSize: '0.875rem',
            fontWeight: 600,
            outline: 'none',
            padding: '0.375rem 0.5rem',
            textAlign: 'center',
            width: '50px'
        },
        staggerText: {
            color: '#64748b',
            fontSize: '0.875rem'
        },
        checkboxRow: {
            marginTop: '0.75rem'
        },
        checkboxLabel: {
            alignItems: 'center',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            gap: '0.5rem'
        },
        checkbox: {
            accentColor: '#3b82f6',
            cursor: 'pointer',
            height: '16px',
            width: '16px'
        },
        individualTimesSection: {
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginTop: '1rem',
            padding: '1rem'
        },
        individualTimesHeaderRow: {
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
        },
        individualTimesHeader: {
            color: '#475569',
            fontSize: '0.8125rem',
            fontWeight: 600
        },
        clearTimesBtn: {
            alignItems: 'center',
            background: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.75rem',
            fontWeight: 500,
            gap: '0.375rem',
            padding: '0.375rem 0.625rem'
        },
        operatorRow: {
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: isMobile ? '60px 1fr 1fr' : '80px 1fr 1fr',
            padding: '0.5rem 0'
        },
        operatorRowLast: {
            alignItems: 'center',
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: isMobile ? '60px 1fr 1fr' : '80px 1fr 1fr',
            padding: '0.5rem 0'
        },
        operatorLabel: {
            color: '#64748b',
            fontSize: '0.8125rem',
            fontWeight: 500
        },
        operatorTimeInput: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            color: '#1e293b',
            fontSize: '0.8125rem',
            outline: 'none',
            padding: '0.5rem 0.625rem',
            width: '100%'
        },
        travelInfo: {
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            marginTop: '1rem',
            padding: '0.75rem 1rem'
        },
        travelInfoItem: {
            alignItems: 'center',
            color: '#065f46',
            display: 'flex',
            fontSize: '0.8125rem',
            fontWeight: 500,
            gap: '0.5rem'
        },
        travelInfoMissing: {
            alignItems: 'center',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#92400e',
            display: 'flex',
            fontSize: '0.8125rem',
            fontWeight: 500,
            gap: '0.5rem',
            marginTop: '1rem',
            padding: '0.75rem 1rem'
        },
        staggeredSchedule: {
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginTop: '1rem',
            padding: '1rem'
        },
        staggeredHeader: {
            alignItems: 'center',
            color: '#1e3a5f',
            display: 'flex',
            fontSize: '0.8125rem',
            fontWeight: 600,
            gap: '0.5rem',
            marginBottom: '0.75rem'
        },
        staggeredGrid: {
            display: 'grid',
            gap: '0.5rem',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))'
        },
        staggeredItem: {
            background: 'white',
            border: '1px solid #dbeafe',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0.625rem 0.75rem'
        },
        staggeredDriver: {
            color: '#1e3a5f',
            fontSize: '0.8125rem',
            fontWeight: 600
        },
        staggeredTime: {
            color: '#64748b',
            fontSize: '0.6875rem'
        },
        notes: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1e293b',
            fontSize: '0.9375rem',
            minHeight: '80px',
            outline: 'none',
            padding: '1rem',
            resize: 'vertical',
            width: '100%'
        },
        buttonsRow: {
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '1rem',
            marginTop: '1rem'
        },
        genBtn: {
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '1rem',
            fontWeight: 600,
            gap: '0.5rem',
            justifyContent: 'center',
            padding: '1rem 1.5rem',
            transition: 'all 0.2s'
        },
        msgBox: {
            background: 'white',
            backgroundImage: `
                linear-gradient(rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 95, 0.02) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(30, 58, 95, 0.015) 0%, transparent 50%)
            `,
            backgroundPosition: '0 0, 0 0, 0 0',
            backgroundSize: '20px 20px, 20px 20px, 40px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            flex: 1,
            maxHeight: '600px',
            overflowY: 'auto',
            padding: '1.5rem'
        },
        msgText: {
            color: '#1e293b',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            margin: 0,
            whiteSpace: 'pre-wrap'
        },
        msgLoading: {
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            justifyContent: 'center',
            padding: '2rem'
        },
        msgLoadingDots: {
            display: 'flex',
            gap: '0.5rem'
        },
        msgLoadingDot: {
            animation: 'pulse 1.4s ease-in-out infinite',
            background: '#1e3a5f',
            borderRadius: '50%',
            height: '10px',
            width: '10px'
        },
        msgLoadingText: {
            color: '#64748b',
            fontSize: '0.875rem'
        },
        copyBtn: (copied) => ({
            alignItems: 'center',
            background: copied ? '#dcfce7' : '#e0f2fe',
            border: 'none',
            borderRadius: '8px',
            color: copied ? '#16a34a' : '#0284c7',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '0.875rem',
            fontWeight: 600,
            gap: '0.5rem',
            padding: '0.625rem 1rem'
        })
    }

    useEffect(() => {
        async function loadData() {
            const user = await UserService.getCurrentUser()

            let plantList = []
            if (user?.id) {
                setUserId(user.id)
                plantList = await ReportService.fetchPlantsForUser(user.id)
                const hasEditPerm = await UserService.hasPermission(user.id, 'plan.edit').catch(() => false)
                setCanEditTravelTimes(hasEditPerm)
            }

            if (plantList.length === 0) {
                plantList = await ReportService.fetchPlantsSorted()
            }

            const sorted = plantList
                .filter((p) => p.plant_code)
                .sort((a, b) => String(a.plant_code).localeCompare(String(b.plant_code)))
            setPlants(sorted)

            if (sorted.length > 0) {
                const plantCodes = sorted.map((p) => p.plant_code).filter(Boolean)
                const counts = await ReportService.fetchActiveMixerCountsByPlant(plantCodes)
                setMixerCountsByPlant(counts)
            }

            await loadTravelTimes()
            setIsLoadingPlan(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        if (!userId || !planDate || isLoadingPlan) return
        const loadUserPlan = async () => {
            try {
                const plan = await PlanService.fetchUserPlan(userId, planDate)
                if (plan) {
                    if (plan.assignments && Array.isArray(plan.assignments) && plan.assignments.length > 0) {
                        setAssignments(plan.assignments)
                    }
                    if (plan.notes) setNotes(plan.notes)
                }
            } catch (e) {}
        }
        loadUserPlan()
    }, [userId, planDate, isLoadingPlan])

    useEffect(() => {
        if (!userId || !planDate || isLoadingPlan) return
        const saveTimeout = setTimeout(async () => {
            try {
                await PlanService.saveUserPlan(userId, planDate, assignments, notes)
            } catch (e) {}
        }, 1000)
        return () => clearTimeout(saveTimeout)
    }, [userId, planDate, assignments, notes, isLoadingPlan])

    const loadTravelTimes = async () => {
        try {
            await PlanService.fetchTravelTimes()
            setTravelTimes(PlanService.getTravelTimesMap())
        } catch (e) {
            setTravelTimes({})
        }
    }

    const getTravelTimeKey = (from, to) => `${from}->${to}`

    const getTravelTime = (from, to) => {
        const key = getTravelTimeKey(from, to)
        return travelTimes[key] || null
    }

    const addTravelTime = async () => {
        if (!newTravelTime.from || !newTravelTime.to || !newTravelTime.minutes) return
        if (newTravelTime.from === newTravelTime.to) return
        setIsSaving(true)
        try {
            await PlanService.upsertTravelTime(newTravelTime.from, newTravelTime.to, parseInt(newTravelTime.minutes))
            await PlanService.upsertTravelTime(newTravelTime.to, newTravelTime.from, parseInt(newTravelTime.minutes))
            await loadTravelTimes()
            setNewTravelTime({ from: '', minutes: '', to: '' })
        } catch (e) {}
        setIsSaving(false)
    }

    const removeTravelTime = async (key) => {
        const [from, to] = key.split('->')
        setIsSaving(true)
        try {
            await PlanService.deleteTravelTime(from, to)
            await PlanService.deleteTravelTime(to, from)
            await loadTravelTimes()
        } catch (e) {}
        setIsSaving(false)
    }

    const updateTravelTimeValue = async (key, minutes) => {
        const [from, to] = key.split('->')
        setIsSaving(true)
        try {
            await PlanService.upsertTravelTime(from, to, parseInt(minutes))
            await PlanService.upsertTravelTime(to, from, parseInt(minutes))
            await loadTravelTimes()
        } catch (e) {}
        setIsSaving(false)
        setEditingTravelTime(null)
    }

    const formatTime = (time24) => {
        if (!time24) return ''
        return time24
    }

    const calculateClockInTime = (arrivalTime, fromPlant, toPlant) => {
        if (!arrivalTime || !fromPlant || !toPlant) return null
        const baseTravelTime = getTravelTime(fromPlant, toPlant)
        if (baseTravelTime === null) return null

        const totalMinutes = baseTravelTime + BUFFER_MINUTES + PRE_TRIP_MINUTES
        const [hours, minutes] = arrivalTime.split(':').map(Number)
        const arrivalDate = new Date()
        arrivalDate.setHours(hours, minutes, 0, 0)
        arrivalDate.setMinutes(arrivalDate.getMinutes() - totalMinutes)

        const clockInHours = String(arrivalDate.getHours()).padStart(2, '0')
        const clockInMinutes = String(arrivalDate.getMinutes()).padStart(2, '0')
        return `${clockInHours}:${clockInMinutes}`
    }

    const calculateLeaveYardTime = (arrivalTime, fromPlant, toPlant) => {
        if (!arrivalTime || !fromPlant || !toPlant) return null
        const baseTravelTime = getTravelTime(fromPlant, toPlant)
        if (baseTravelTime === null) return null

        const totalMinutes = baseTravelTime + BUFFER_MINUTES
        const [hours, minutes] = arrivalTime.split(':').map(Number)
        const arrivalDate = new Date()
        arrivalDate.setHours(hours, minutes, 0, 0)
        arrivalDate.setMinutes(arrivalDate.getMinutes() - totalMinutes)

        const leaveHours = String(arrivalDate.getHours()).padStart(2, '0')
        const leaveMinutes = String(arrivalDate.getMinutes()).padStart(2, '0')
        return `${leaveHours}:${leaveMinutes}`
    }

    const addMinutesToTime = (time24, minutesToAdd) => {
        if (!time24) return null
        const [hours, minutes] = time24.split(':').map(Number)
        const date = new Date()
        date.setHours(hours, minutes, 0, 0)
        date.setMinutes(date.getMinutes() + minutesToAdd)
        const newHours = String(date.getHours()).padStart(2, '0')
        const newMinutes = String(date.getMinutes()).padStart(2, '0')
        return `${newHours}:${newMinutes}`
    }

    const getStaggeredSchedule = (assignment) => {
        if (!assignment.time || !assignment.fromPlant || !assignment.toPlant) return null
        if (assignment.driverCount <= 1) return null

        const baseTravelTime = getTravelTime(assignment.fromPlant, assignment.toPlant)
        if (baseTravelTime === null) return null

        const schedule = []
        for (let i = 0; i < assignment.driverCount; i++) {
            const staggerOffset = i * (assignment.staggerMinutes || 10)
            const arrivalTime = addMinutesToTime(assignment.time, staggerOffset)
            const clockInTime = calculateClockInTime(arrivalTime, assignment.fromPlant, assignment.toPlant)
            const leaveYardTime = calculateLeaveYardTime(arrivalTime, assignment.fromPlant, assignment.toPlant)

            schedule.push({
                arrivalTime,
                clockInTime,
                driverNumber: i + 1,
                leaveYardTime
            })
        }
        return schedule
    }

    const addAssignment = () => {
        setAssignments([
            ...assignments,
            {
                driverCount: 1,
                fromPlant: '',
                hurryOffClock: false,
                id: Date.now(),
                operatorTimes: [],
                returnTime: '',
                staggerMinutes: 10,
                time: '',
                toPlant: '',
                useIndividualTimes: false
            }
        ])
    }

    const updateAssignment = (id, field, value) => {
        setAssignments(
            assignments.map((a) => {
                if (a.id !== id) return a
                const updated = { ...a, [field]: value }
                if (field === 'driverCount' && value > 1 && updated.useIndividualTimes) {
                    const currentTimes = updated.operatorTimes || []
                    const newTimes = []
                    for (let i = 0; i < value; i++) {
                        newTimes.push(
                            currentTimes[i] || { arriveTime: updated.time || '', returnTime: updated.returnTime || '' }
                        )
                    }
                    updated.operatorTimes = newTimes
                }
                return updated
            })
        )
    }

    const updateOperatorTime = (assignmentId, operatorIndex, field, value) => {
        setAssignments(
            assignments.map((a) => {
                if (a.id !== assignmentId) return a
                const newTimes = [...(a.operatorTimes || [])]
                if (!newTimes[operatorIndex]) {
                    newTimes[operatorIndex] = { arriveTime: '', returnTime: '' }
                }
                newTimes[operatorIndex] = { ...newTimes[operatorIndex], [field]: value }
                return { ...a, operatorTimes: newTimes }
            })
        )
    }

    const toggleIndividualTimes = (assignmentId) => {
        setAssignments(
            assignments.map((a) => {
                if (a.id !== assignmentId) return a
                const newUseIndividual = !a.useIndividualTimes
                if (newUseIndividual && a.driverCount > 1) {
                    const staggeredSchedule = getStaggeredSchedule(a)
                    const newTimes = []
                    for (let i = 0; i < a.driverCount; i++) {
                        if (staggeredSchedule && staggeredSchedule[i]) {
                            newTimes.push({
                                arriveTime: staggeredSchedule[i].arrivalTime || a.time || '',
                                returnTime: a.returnTime || ''
                            })
                        } else {
                            const staggerOffset = i * (a.staggerMinutes || 10)
                            const staggeredArrival = a.time ? addMinutesToTime(a.time, staggerOffset) : ''
                            newTimes.push({
                                arriveTime: staggeredArrival || a.time || '',
                                returnTime: a.returnTime || ''
                            })
                        }
                    }
                    return { ...a, operatorTimes: newTimes, useIndividualTimes: newUseIndividual }
                }
                return { ...a, useIndividualTimes: newUseIndividual }
            })
        )
    }

    const clearOperatorTimes = (assignmentId) => {
        setAssignments(
            assignments.map((a) => {
                if (a.id !== assignmentId) return a
                const newTimes = []
                for (let i = 0; i < a.driverCount; i++) {
                    newTimes.push({ arriveTime: '', returnTime: '' })
                }
                return { ...a, operatorTimes: newTimes }
            })
        )
    }

    const removeAssignment = (id) => {
        setAssignments(assignments.filter((a) => a.id !== id))
    }

    const getOperatorWarning = (assignment) => {
        if (!assignment.fromPlant || !assignment.driverCount) return null
        const available = mixerCountsByPlant[assignment.fromPlant] || 0
        if (assignment.driverCount > available) {
            return `${assignment.fromPlant} only has ${available} active operator${available !== 1 ? 's' : ''}`
        }
        return null
    }

    const getAllocationStats = () => {
        const stats = {}

        plants.forEach((p) => {
            const plantCode = p.plant_code
            const baseMixers = mixerCountsByPlant[plantCode] || 0
            stats[plantCode] = {
                base: baseMixers,
                plantCode,
                receiving: 0,
                sending: 0
            }
        })

        assignments.forEach((a) => {
            if (a.fromPlant && a.toPlant && a.driverCount > 0) {
                const count = parseInt(a.driverCount) || 0
                if (stats[a.fromPlant]) {
                    stats[a.fromPlant].sending += count
                }
                if (stats[a.toPlant]) {
                    stats[a.toPlant].receiving += count
                }
            }
        })

        return Object.values(stats)
            .filter((s) => s.base > 0 || s.sending > 0 || s.receiving > 0)
            .map((s) => {
                const effective = s.base - s.sending + s.receiving
                const percent = s.base > 0 ? Math.round((effective / s.base) * 100) : effective > 0 ? 999 : 0
                return {
                    ...s,
                    effective,
                    percent
                }
            })
            .sort((a, b) => String(a.plantCode).localeCompare(String(b.plantCode)))
    }

    const generateMessage = () => {
        if (assignments.length === 0) return

        setIsGenerating(true)
        setGeneratedMessage('')

        const validAssignments = assignments.filter((a) => a.fromPlant && a.toPlant && a.driverCount > 0)

        if (validAssignments.length === 0) {
            setGeneratedMessage('Please add at least one complete assignment.')
            setIsGenerating(false)
            return
        }

        const selectedDate = new Date(planDate + 'T00:00:00')
        const dateStr = selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
        const divider = '──────────────────────────'

        let message = `Plan - ${dateStr}\n`

        const hurryOffClockPlants = []

        validAssignments.forEach((a, idx) => {
            if (idx > 0) {
                message += `\n${divider}\n`
            }
            message += '\n'

            const operatorWord = a.driverCount === 1 ? 'operator' : 'operators'
            const staggeredSchedule = getStaggeredSchedule(a)
            const clockInTime = calculateClockInTime(a.time, a.fromPlant, a.toPlant)

            if (a.hurryOffClock) {
                hurryOffClockPlants.push(a.fromPlant)
            }

            if (a.useIndividualTimes && a.driverCount > 1 && a.operatorTimes?.length > 0) {
                message += `${a.fromPlant} → ${a.toPlant}  (${a.driverCount} ${operatorWord}, custom times)\n`
                a.operatorTimes.forEach((opTime, opIdx) => {
                    if (opTime.arriveTime) {
                        const opClockIn = calculateClockInTime(opTime.arriveTime, a.fromPlant, a.toPlant)
                        const opLeaveYard = calculateLeaveYardTime(opTime.arriveTime, a.fromPlant, a.toPlant)
                        message += `• Op ${opIdx + 1}: In ${opClockIn ? formatTime(opClockIn) : '--'} | Leave ${opLeaveYard ? formatTime(opLeaveYard) : '--'} | Arrive ${formatTime(opTime.arriveTime)}`
                        if (opTime.returnTime) {
                            message += ` | Return ${formatTime(opTime.returnTime)}`
                        }
                        message += '\n'
                    }
                })
            } else if (a.driverCount > 1 && staggeredSchedule) {
                message += `${a.fromPlant} → ${a.toPlant}  (${a.driverCount} ${operatorWord}, staggered ${a.staggerMinutes} min)\n`
                staggeredSchedule.forEach((s) => {
                    message += `• Op ${s.driverNumber}: In ${formatTime(s.clockInTime)} | Leave ${formatTime(s.leaveYardTime)} | Arrive ${formatTime(s.arrivalTime)}\n`
                })
                if (a.returnTime) {
                    message += `• Return by: ${formatTime(a.returnTime)}\n`
                }
            } else {
                message += `${a.fromPlant} → ${a.toPlant}  (${a.driverCount} ${operatorWord})\n`
                if (clockInTime) {
                    message += `• Clock in: ${formatTime(clockInTime)}\n`
                }
                if (a.time) {
                    message += `• Arrive by: ${formatTime(a.time)}\n`
                }
                if (a.returnTime) {
                    message += `• Return by: ${formatTime(a.returnTime)}\n`
                }
            }
        })

        if (notes) {
            message += `\n${divider}\n\n`
            message += `Notes: ${notes}\n`
        }

        if (hurryOffClockPlants.length > 0) {
            message += `\n${divider}\n\n`
            message += `Reminder: ${hurryOffClockPlants.join(', ')} - please remind your operators to hurry off the clock to ensure they get their 10-hour reset.`
        }

        setGeneratedMessage(message.trim())
        setIsGenerating(false)
    }

    const copyToClipboard = async () => {
        if (!generatedMessage) return
        await navigator.clipboard.writeText(generatedMessage)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const clearAll = () => {
        setAssignments([])
        setGeneratedMessage('')
        setNotes('')
    }

    const createNewPlan = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setPlanDate(tomorrow.toISOString().split('T')[0])
        setAssignments([
            {
                driverCount: 1,
                fromPlant: '',
                hurryOffClock: false,
                id: Date.now(),
                operatorTimes: [],
                returnTime: '',
                staggerMinutes: 10,
                time: '',
                toPlant: '',
                useIndividualTimes: false
            },
            {
                driverCount: 1,
                fromPlant: '',
                hurryOffClock: false,
                id: Date.now() + 1,
                operatorTimes: [],
                returnTime: '',
                staggerMinutes: 10,
                time: '',
                toPlant: '',
                useIndividualTimes: false
            }
        ])
        setGeneratedMessage('')
        setNotes('')
    }

    const renderTravelTimeInfo = (assignment) => {
        if (!assignment.fromPlant || !assignment.toPlant) return null

        const travelTime = getTravelTime(assignment.fromPlant, assignment.toPlant)
        const clockInTime = calculateClockInTime(assignment.time, assignment.fromPlant, assignment.toPlant)
        const staggeredSchedule = getStaggeredSchedule(assignment)

        if (travelTime === null) {
            return (
                <div style={styles.travelInfoMissing}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>No travel time configured for this route</span>
                </div>
            )
        }

        const totalTime = travelTime + BUFFER_MINUTES

        if (staggeredSchedule) {
            return (
                <div style={styles.staggeredSchedule}>
                    <div style={styles.staggeredHeader}>
                        <i className="fas fa-clock"></i>
                        <span>Staggered Schedule</span>
                    </div>
                    <div style={styles.staggeredGrid}>
                        {staggeredSchedule.map((s) => (
                            <div key={s.driverNumber} style={styles.staggeredItem}>
                                <span style={styles.staggeredDriver}>Operator {s.driverNumber}</span>
                                <span style={styles.staggeredTime}>Clock in: {formatTime(s.clockInTime)}</span>
                                <span style={styles.staggeredTime}>Leave yard: {formatTime(s.leaveYardTime)}</span>
                                <span style={styles.staggeredTime}>Arrive: {formatTime(s.arrivalTime)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        return assignment.time ? (
            <div style={styles.travelInfo}>
                <div style={styles.travelInfoItem}>
                    <i className="fas fa-clock"></i>
                    <span>Clock in by {formatTime(clockInTime)}</span>
                </div>
                <div style={styles.travelInfoItem}>
                    <i className="fas fa-route"></i>
                    <span>~{totalTime} min travel time</span>
                </div>
            </div>
        ) : null
    }

    return (
        <div style={styles.view}>
            <div style={styles.content(!sidebarMinimized && getAllocationStats().length > 0)}>
                <div style={styles.header}>
                    <div style={styles.titleRow}>
                        <h1 style={styles.title}>Operator Plan</h1>
                        <div style={styles.headerActions}>
                            <input
                                type="date"
                                style={styles.dateInput}
                                value={planDate}
                                onChange={(e) => setPlanDate(e.target.value)}
                            />
                            <button style={styles.newPlanBtn} onClick={createNewPlan}>
                                <i className="fas fa-plus"></i>
                                New Plan
                            </button>
                            {canEditTravelTimes && (
                                <button
                                    style={styles.actionBtn(showTravelConfig)}
                                    onClick={() => setShowTravelConfig(!showTravelConfig)}
                                >
                                    <i className="fas fa-cog"></i>
                                    Travel Times
                                </button>
                            )}
                            {assignments.length > 0 && (
                                <button style={styles.dangerBtn} onClick={clearAll}>
                                    <i className="fas fa-trash-alt"></i>
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {plants.length > 0 && Object.keys(mixerCountsByPlant).length > 0 && (
                        <div style={styles.mixerCountsRow}>
                            {plants.map((p) => (
                                <div key={p.plant_code} style={styles.mixerBadge}>
                                    <span style={styles.mixerBadgePlant}>{p.plant_code}</span>
                                    <span style={styles.mixerBadgeCount}>{mixerCountsByPlant[p.plant_code] || 0}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isMobile && getAllocationStats().length > 0 && (
                    <div style={styles.mobileAllocationCard}>
                        <div style={styles.mobileAllocationTitle}>
                            <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem' }}></i>
                            Allocation
                        </div>
                        <div style={styles.mobileAllocationGrid}>
                            {getAllocationStats().map((stat) => (
                                <div key={stat.plantCode} style={styles.mobileAllocationItem}>
                                    <span style={{ color: '#475569', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        {stat.plantCode}
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                stat.percent > 100
                                                    ? '#16a34a'
                                                    : stat.percent < 100
                                                      ? '#d97706'
                                                      : '#1e3a5f',
                                            fontSize: '0.8125rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        {stat.percent}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {getAllocationStats().length > 0 && (
                    <div style={styles.allocationSidebar(sidebarMinimized)}>
                        {sidebarMinimized ? (
                            <button
                                style={styles.allocationMinBtn}
                                onClick={() => setSidebarMinimized(false)}
                                title="Expand allocation"
                            >
                                <i className="fas fa-chart-bar" style={styles.allocationMinimizedIcon}></i>
                            </button>
                        ) : (
                            <>
                                <div style={styles.allocationSidebarHeader}>
                                    <span style={styles.allocationSidebarTitle}>Allocation</span>
                                    <button
                                        style={styles.allocationMinBtn}
                                        onClick={() => setSidebarMinimized(true)}
                                        title="Minimize"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                </div>
                                <div style={styles.allocationContent}>
                                    {getAllocationStats().map((stat) => (
                                        <div key={stat.plantCode} style={styles.allocationBarItem}>
                                            <span style={styles.allocationBarLabel}>{stat.plantCode}</span>
                                            <div style={styles.allocationBarTrack}>
                                                <div style={styles.allocationBarFill(stat.percent)}></div>
                                            </div>
                                            <span style={styles.allocationBarPercent(stat.percent)}>
                                                {stat.percent}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {showTravelConfig && canEditTravelTimes && (
                    <div style={styles.configCard}>
                        <div style={styles.configHeader}>
                            <span style={styles.configTitle}>Travel Times Configuration</span>
                            <span style={styles.configSub}>
                                +{BUFFER_MINUTES} min buffer, +{PRE_TRIP_MINUTES} min pre-trip automatically added
                            </span>
                        </div>
                        <div style={styles.configForm}>
                            <select
                                style={styles.configSelect}
                                value={newTravelTime.from}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, from: e.target.value })}
                            >
                                <option value="">From</option>
                                {plants.map((p) => (
                                    <option key={p.plant_code} value={p.plant_code}>
                                        {p.plant_code}
                                    </option>
                                ))}
                            </select>
                            <span style={styles.configArrow}>→</span>
                            <select
                                style={styles.configSelect}
                                value={newTravelTime.to}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, to: e.target.value })}
                            >
                                <option value="">To</option>
                                {plants.map((p) => (
                                    <option key={p.plant_code} value={p.plant_code}>
                                        {p.plant_code}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="1"
                                placeholder="minutes"
                                style={styles.configMinInput}
                                value={newTravelTime.minutes}
                                onChange={(e) => setNewTravelTime({ ...newTravelTime, minutes: e.target.value })}
                            />
                            <button style={styles.configAddBtn} onClick={addTravelTime} disabled={isSaving}>
                                <i className={isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-plus'}></i>
                            </button>
                        </div>
                        {Object.keys(travelTimes).length > 0 && (
                            <div style={styles.configList}>
                                {Object.entries(travelTimes)
                                    .filter(([key]) => {
                                        const [from, to] = key.split('->')
                                        return from < to
                                    })
                                    .map(([key, minutes]) => {
                                        const [from, to] = key.split('->')
                                        return (
                                            <div key={key} style={styles.configItem}>
                                                <span style={styles.configRoute}>
                                                    {from} ↔ {to}
                                                </span>
                                                {editingTravelTime === key ? (
                                                    <input
                                                        type="number"
                                                        style={styles.configEditInput}
                                                        defaultValue={minutes}
                                                        onBlur={(e) => updateTravelTimeValue(key, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter')
                                                                updateTravelTimeValue(key, e.target.value)
                                                            if (e.key === 'Escape') setEditingTravelTime(null)
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={styles.configTime}
                                                        onClick={() => setEditingTravelTime(key)}
                                                    >
                                                        {minutes} min
                                                    </span>
                                                )}
                                                <button
                                                    style={styles.configDelBtn}
                                                    onClick={() => removeTravelTime(key)}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </div>
                )}

                <div style={styles.mainGrid}>
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionTitle}>Assignments</span>
                        </div>

                        {assignments.length === 0 ? (
                            <div style={styles.empty}>
                                <i className="fas fa-truck" style={styles.emptyIcon}></i>
                                <p style={styles.emptyText}>No assignments yet</p>
                            </div>
                        ) : (
                            <div style={styles.list}>
                                {assignments.map((assignment, index) => (
                                    <div key={assignment.id} style={styles.card}>
                                        <div style={styles.cardHeader}>
                                            <span style={styles.cardNum}>Assignment #{index + 1}</span>
                                            <button
                                                style={styles.cardDel}
                                                onClick={() => removeAssignment(assignment.id)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                        <div style={styles.cardRow}>
                                            <div style={styles.field}>
                                                <label style={styles.fieldLabel}>From Plant</label>
                                                <select
                                                    style={styles.fieldSelect}
                                                    value={assignment.fromPlant}
                                                    onChange={(e) =>
                                                        updateAssignment(assignment.id, 'fromPlant', e.target.value)
                                                    }
                                                >
                                                    <option value="">Select...</option>
                                                    {plants
                                                        .filter((p) => p.plant_code !== assignment.toPlant)
                                                        .map((p) => (
                                                            <option key={p.plant_code} value={p.plant_code}>
                                                                {p.plant_code}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                            <div style={styles.field}>
                                                <label style={styles.fieldLabel}>To Plant</label>
                                                <select
                                                    style={styles.fieldSelect}
                                                    value={assignment.toPlant}
                                                    onChange={(e) =>
                                                        updateAssignment(assignment.id, 'toPlant', e.target.value)
                                                    }
                                                >
                                                    <option value="">Select...</option>
                                                    {plants
                                                        .filter((p) => p.plant_code !== assignment.fromPlant)
                                                        .map((p) => (
                                                            <option key={p.plant_code} value={p.plant_code}>
                                                                {p.plant_code}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                            <div style={styles.field}>
                                                <label style={styles.fieldLabel}>Operators</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    style={styles.fieldInputSm}
                                                    value={assignment.driverCount}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '')
                                                        updateAssignment(
                                                            assignment.id,
                                                            'driverCount',
                                                            val === '' ? '' : parseInt(val)
                                                        )
                                                    }}
                                                    onBlur={(e) => {
                                                        if (!e.target.value) {
                                                            updateAssignment(assignment.id, 'driverCount', 1)
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div style={styles.field}>
                                                <label style={styles.fieldLabel}>Arrive By</label>
                                                <input
                                                    type="text"
                                                    placeholder="HH:MM"
                                                    style={styles.fieldInput}
                                                    value={assignment.time}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/[^\d:]/g, '')
                                                        if (
                                                            val.length === 2 &&
                                                            !val.includes(':') &&
                                                            e.target.value.length > assignment.time.length
                                                        ) {
                                                            val = val + ':'
                                                        }
                                                        if (val.length <= 5) {
                                                            updateAssignment(assignment.id, 'time', val)
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div style={styles.field}>
                                                <label style={styles.fieldLabel}>Return By</label>
                                                <input
                                                    type="text"
                                                    placeholder="HH:MM"
                                                    style={styles.fieldInput}
                                                    value={assignment.returnTime}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/[^\d:]/g, '')
                                                        if (
                                                            val.length === 2 &&
                                                            !val.includes(':') &&
                                                            e.target.value.length > assignment.returnTime.length
                                                        ) {
                                                            val = val + ':'
                                                        }
                                                        if (val.length <= 5) {
                                                            updateAssignment(assignment.id, 'returnTime', val)
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {getOperatorWarning(assignment) && (
                                            <div style={styles.warning}>
                                                <i className="fas fa-exclamation-triangle"></i>
                                                <span>{getOperatorWarning(assignment)}</span>
                                            </div>
                                        )}
                                        {assignment.driverCount > 1 && (
                                            <div style={styles.stagger}>
                                                <span style={styles.staggerLabel}>Stagger arrivals by</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    style={styles.staggerInput}
                                                    value={assignment.staggerMinutes}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '')
                                                        updateAssignment(
                                                            assignment.id,
                                                            'staggerMinutes',
                                                            val === '' ? '' : parseInt(val)
                                                        )
                                                    }}
                                                    onBlur={(e) => {
                                                        if (!e.target.value) {
                                                            updateAssignment(assignment.id, 'staggerMinutes', 10)
                                                        }
                                                    }}
                                                />
                                                <span style={styles.staggerText}>minutes</span>
                                            </div>
                                        )}
                                        {assignment.driverCount > 1 && (
                                            <div style={styles.checkboxRow}>
                                                <label style={styles.checkboxLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={assignment.useIndividualTimes || false}
                                                        onChange={() => toggleIndividualTimes(assignment.id)}
                                                        style={styles.checkbox}
                                                    />
                                                    <span>Edit individual operator times</span>
                                                </label>
                                            </div>
                                        )}
                                        {assignment.driverCount > 1 && assignment.useIndividualTimes && (
                                            <div style={styles.individualTimesSection}>
                                                <div style={styles.individualTimesHeaderRow}>
                                                    <div style={styles.individualTimesHeader}>
                                                        <span>Operator</span>
                                                        <span style={{ marginLeft: isMobile ? '30px' : '50px' }}>
                                                            Arrive By
                                                        </span>
                                                        <span style={{ marginLeft: isMobile ? '50px' : '80px' }}>
                                                            Return By
                                                        </span>
                                                    </div>
                                                    <button
                                                        style={styles.clearTimesBtn}
                                                        onClick={() => clearOperatorTimes(assignment.id)}
                                                    >
                                                        <i className="fas fa-eraser"></i>
                                                        Clear
                                                    </button>
                                                </div>
                                                {Array.from({ length: assignment.driverCount }).map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={
                                                            idx === assignment.driverCount - 1
                                                                ? styles.operatorRowLast
                                                                : styles.operatorRow
                                                        }
                                                    >
                                                        <span style={styles.operatorLabel}>Op {idx + 1}</span>
                                                        <input
                                                            type="text"
                                                            placeholder="HH:MM"
                                                            style={styles.operatorTimeInput}
                                                            value={assignment.operatorTimes?.[idx]?.arriveTime || ''}
                                                            onChange={(e) => {
                                                                let val = e.target.value.replace(/[^\d:]/g, '')
                                                                if (
                                                                    val.length === 2 &&
                                                                    !val.includes(':') &&
                                                                    e.target.value.length >
                                                                        (
                                                                            assignment.operatorTimes?.[idx]
                                                                                ?.arriveTime || ''
                                                                        ).length
                                                                ) {
                                                                    val = val + ':'
                                                                }
                                                                if (val.length <= 5) {
                                                                    updateOperatorTime(
                                                                        assignment.id,
                                                                        idx,
                                                                        'arriveTime',
                                                                        val
                                                                    )
                                                                }
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="HH:MM"
                                                            style={styles.operatorTimeInput}
                                                            value={assignment.operatorTimes?.[idx]?.returnTime || ''}
                                                            onChange={(e) => {
                                                                let val = e.target.value.replace(/[^\d:]/g, '')
                                                                if (
                                                                    val.length === 2 &&
                                                                    !val.includes(':') &&
                                                                    e.target.value.length >
                                                                        (
                                                                            assignment.operatorTimes?.[idx]
                                                                                ?.returnTime || ''
                                                                        ).length
                                                                ) {
                                                                    val = val + ':'
                                                                }
                                                                if (val.length <= 5) {
                                                                    updateOperatorTime(
                                                                        assignment.id,
                                                                        idx,
                                                                        'returnTime',
                                                                        val
                                                                    )
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {assignment.fromPlant &&
                                            assignment.toPlant &&
                                            assignment.driverCount > 0 &&
                                            assignment.time &&
                                            assignment.returnTime && (
                                                <div style={styles.checkboxRow}>
                                                    <label style={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={assignment.hurryOffClock || false}
                                                            onChange={(e) =>
                                                                updateAssignment(
                                                                    assignment.id,
                                                                    'hurryOffClock',
                                                                    e.target.checked
                                                                )
                                                            }
                                                            style={styles.checkbox}
                                                        />
                                                        <span>Remind operators to hurry off clock (10-hour reset)</span>
                                                    </label>
                                                </div>
                                            )}
                                        {renderTravelTimeInfo(assignment)}
                                    </div>
                                ))}
                            </div>
                        )}

                        {assignments.length > 0 && (
                            <>
                                <textarea
                                    style={styles.notes}
                                    placeholder="Additional notes (optional)"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <div style={styles.buttonsRow}>
                                    <button style={styles.addBtn} onClick={addAssignment}>
                                        <i className="fas fa-plus"></i>
                                        Add Assignment
                                    </button>
                                    <button style={styles.genBtn} onClick={generateMessage} disabled={isGenerating}>
                                        {isGenerating ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Generating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-magic"></i> Generate Message
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                        {assignments.length === 0 && (
                            <button style={styles.addBtn} onClick={addAssignment}>
                                <i className="fas fa-plus"></i>
                                Add Assignment
                            </button>
                        )}
                    </div>

                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionTitle}>Generated Message</span>
                            {generatedMessage && !isGenerating && (
                                <button style={styles.copyBtn(copied)} onClick={copyToClipboard}>
                                    <i className={copied ? 'fas fa-check' : 'fas fa-copy'}></i>
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            )}
                        </div>
                        {isGenerating ? (
                            <div style={styles.msgBox}>
                                <div style={styles.msgLoading}>
                                    <div style={styles.msgLoadingDots}>
                                        <div style={{ ...styles.msgLoadingDot, animationDelay: '0s' }}></div>
                                        <div style={{ ...styles.msgLoadingDot, animationDelay: '0.2s' }}></div>
                                        <div style={{ ...styles.msgLoadingDot, animationDelay: '0.4s' }}></div>
                                    </div>
                                    <span style={styles.msgLoadingText}>Generating message...</span>
                                </div>
                            </div>
                        ) : generatedMessage ? (
                            <div style={styles.msgBox}>
                                <pre style={styles.msgText}>{generatedMessage}</pre>
                            </div>
                        ) : (
                            <div style={styles.empty}>
                                <i className="fas fa-comment-alt" style={styles.emptyIcon}></i>
                                <p style={styles.emptyText}>
                                    Generated message will appear here. It is generated to send to plant managers.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlanView
