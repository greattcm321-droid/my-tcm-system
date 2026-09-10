import React, { useState, useMemo, useEffect } from 'react'
import { X, Search, UserPlus, Calendar, Clock, User, Check, Loader2, Home, UserCheck, CalendarDays } from 'lucide-react'
import { appointmentService } from '../../../services/appointmentService'
import { patientService } from '../../../services/patientService'
import type { Patient, UserProfile, Appointment } from '../../../types'

import { format, parse, setHours, setMinutes, differenceInYears } from 'date-fns'
import { useRealtime } from '../../../hooks/useRealtime'

interface QuickBookingModalProps {
    isOpen: boolean
    onClose: () => void
    doctors: UserProfile[]
    clinicId: string
    initialDate?: string // YYYY-MM-DD
    initialDoctorId?: string
    initialTime?: string
}

export default function QuickBookingModal({ isOpen, onClose, doctors, clinicId, initialDate, initialDoctorId, initialTime }: QuickBookingModalProps) {
    const { data: patients, loading: _fetchingPatients } = useRealtime<Patient>('patients', clinicId, [], [isOpen])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Form State
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [isNewPatient, setIsNewPatient] = useState(false)

    // 新病患專用完整表單狀態
    const [tempPatientForm, setTempPatientForm] = useState({
        name: '',
        phone: '',
        gender: 'female' as 'male' | 'female' | 'other',
        dob: '',
        address: ''
    })

    const [doctorId, setDoctorId] = useState(initialDoctorId || '')
    const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'))
    const [time, setTime] = useState(initialTime || '09:00')
    const [type, setType] = useState<Appointment['type']>('initial')
    const [notes, setNotes] = useState('')

    // Reset fields when modal opens with new initials
    useEffect(() => {
        if (isOpen) {
            if (initialDate) setDate(initialDate)
            if (initialDoctorId) setDoctorId(initialDoctorId)
            if (initialTime) setTime(initialTime)

            // If no doctor is selected but we have a list, pick the first one
            if (!initialDoctorId && doctors.length > 0) {
                setDoctorId(doctors[0].id)
            }
        }
    }, [isOpen, initialDate, initialDoctorId, initialTime, doctors])

    // Filter patients based on search
    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return []
        const q = searchQuery.toLowerCase()
        return patients.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.phone.includes(q)
        ).slice(0, 5)
    }, [searchQuery, patients])

    // 計算年齡的 helper
    const calculateAge = (dobString: string) => {
        if (!dobString) return '';
        const age = differenceInYears(new Date(), new Date(dobString));
        return isNaN(age) ? '' : `${age} 歲`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!doctorId || (!selectedPatient && !isNewPatient)) return

        setLoading(true)
        try {
            let patientId = selectedPatient?.id
            let patientName = selectedPatient?.name

            // 如果是新病人，先建立完整的病人資料
            if (isNewPatient) {
                if (!tempPatientForm.name || !tempPatientForm.phone) {
                    alert('請填寫病患姓名與電話！');
                    setLoading(false);
                    return;
                }

                // 處理生日格式 (如果沒填，給一個預設值以防資料庫報錯)
                const dobToSave = tempPatientForm.dob ? new Date(tempPatientForm.dob).toISOString() : new Date().toISOString();

                const newId = await patientService.create(clinicId, {
                    name: tempPatientForm.name,
                    phone: tempPatientForm.phone,
                    gender: tempPatientForm.gender,
                    dob: dobToSave,
                    address: tempPatientForm.address,
                    allergies: [],
                    medical_history: '',
                })
                patientId = newId
                patientName = tempPatientForm.name
            }

            // 解析預約時間
            const [h, m] = time.split(':').map(Number)
            const baseDate = parse(date, 'yyyy-MM-dd', new Date())
            const scheduledDate = setMinutes(setHours(baseDate, h), m)
            const standardizedDateStr = format(scheduledDate, 'yyyy-MM-dd')

            // 建立預約
            await appointmentService.create(clinicId, {
                patientId: patientId!,
                patientName,
                doctorId,
                scheduledAt: scheduledDate.toISOString(),
                dateStr: standardizedDateStr,
                status: 'pending',
                type,
                source: 'internal',
                notes,
                duration: 30 // default 30 minutes
            })

            onClose()
        } catch (err) {
            console.error('Failed to book:', err)
            alert('預約失敗，請重試')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-theme-surface w-full max-w-lg border border-theme-border shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-theme-border bg-theme-surface-alt/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-theme-text flex items-center gap-2">
                        <Calendar className="text-theme-primary" size={20} />
                        掛號與建檔
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-theme-border rounded-sm transition-colors text-theme-text-muted">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

                    {/* Patient Search & Creation */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <User size={14} /> 病患資訊
                        </label>
                        {!selectedPatient && !isNewPatient ? (
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
                                    <input
                                        type="text"
                                        placeholder="輸入姓名或電話搜尋舊病患..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input-field pl-9 h-10"
                                        autoFocus
                                    />
                                </div>

                                {searchQuery && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-theme-surface border border-theme-border shadow-lg rounded-sm overflow-hidden max-h-48 overflow-y-auto">
                                        {filteredPatients.length > 0 ? (
                                            filteredPatients.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPatient(p)
                                                        setSearchQuery('')
                                                    }}
                                                    className="w-full p-2.5 text-left hover:bg-theme-surface-alt flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold text-theme-text">{p.name}</p>
                                                        <p className="text-xs text-theme-text-muted">{p.phone}</p>
                                                    </div>
                                                    <Check size={14} className="text-theme-primary opacity-0 group-hover:opacity-100" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center">
                                                <p className="text-xs text-theme-text-muted mb-2">找不到病患資料</p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsNewPatient(true)
                                                        setTempPatientForm(prev => ({ ...prev, name: searchQuery }))
                                                    }}
                                                    className="text-theme-primary text-xs font-bold hover:underline flex items-center justify-center gap-1 mx-auto bg-theme-primary/10 px-3 py-1.5 rounded-sm"
                                                >
                                                    <UserPlus size={14} />
                                                    為「{searchQuery}」建立新病歷
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-theme-primary/5 border border-theme-primary/20 rounded-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-theme-primary/10 rounded-sm flex items-center justify-center text-theme-primary">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-theme-text">
                                            {isNewPatient ? tempPatientForm.name || '新病患' : selectedPatient?.name}
                                            {isNewPatient && <span className="ml-2 text-[10px] bg-theme-primary text-white px-1 py-0.5 rounded-sm">新病歷建檔</span>}
                                        </p>
                                        <p className="text-xs text-theme-text-muted">
                                            {!isNewPatient && selectedPatient?.phone}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedPatient(null)
                                        setIsNewPatient(false)
                                    }}
                                    className="text-theme-text-muted hover:text-theme-primary text-xs font-bold underline"
                                >
                                    重新選擇
                                </button>
                            </div>
                        )}

                        {/* 完整的新病患建檔表單 */}
                        {isNewPatient && (
                            <div className="space-y-3 p-3 bg-theme-surface-alt/30 border border-theme-border rounded-sm animate-slide-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-theme-text-muted flex items-center gap-1">姓名 <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="input-field h-9"
                                            value={tempPatientForm.name}
                                            onChange={e => setTempPatientForm(prev => ({ ...prev, name: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-theme-text-muted flex items-center gap-1">電話 <span className="text-red-500">*</span></label>
                                        <input
                                            type="tel"
                                            className="input-field h-9"
                                            value={tempPatientForm.phone}
                                            onChange={e => setTempPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 🔥 已修正排版對齊的區塊 */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col justify-end space-y-1">
                                        <label className="text-[10px] font-bold text-theme-text-muted">性別</label>
                                        <select
                                            className="input-field h-9"
                                            value={tempPatientForm.gender}
                                            onChange={e => setTempPatientForm(prev => ({ ...prev, gender: e.target.value as any }))}
                                        >
                                            <option value="female">女</option>
                                            <option value="male">男</option>
                                            <option value="other">其他</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end space-y-1 col-span-2">
                                        <label className="text-[10px] font-bold text-theme-text-muted flex justify-between items-end">
                                            <span>出生日期</span>
                                            {tempPatientForm.dob && <span className="text-theme-primary">{calculateAge(tempPatientForm.dob)}</span>}
                                        </label>
                                        <input
                                            type="date"
                                            className="input-field h-9 w-full"
                                            value={tempPatientForm.dob}
                                            onChange={e => setTempPatientForm(prev => ({ ...prev, dob: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-theme-text-muted flex items-center gap-1"><Home size={10} /> 住宅地址</label>
                                    <input
                                        type="text"
                                        className="input-field h-9"
                                        placeholder="請輸入完整地址..."
                                        value={tempPatientForm.address}
                                        onChange={e => setTempPatientForm(prev => ({ ...prev, address: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-theme-border my-2"></div>

                    {/* Doctor Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <UserCheck size={14} /> 看診醫師
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {doctors.map(doc => (
                                <button
                                    key={doc.id}
                                    type="button"
                                    onClick={() => setDoctorId(doc.id)}
                                    className={`p-2.5 border rounded-sm text-left transition-all flex items-center gap-2 ${doctorId === doc.id
                                        ? 'border-theme-primary bg-theme-primary/5 ring-1 ring-theme-primary'
                                        : 'border-theme-border hover:bg-theme-surface-alt'
                                        }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${doctorId === doc.id ? 'bg-theme-primary' : 'bg-stone-300'}`}></div>
                                    <div>
                                        <p className="text-xs font-bold text-theme-text">{(doc as any).name || doc.displayName}</p>
                                        <p className="text-[10px] text-theme-text-muted">{doc.specialization || '醫師'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                                <CalendarDays size={12} /> 預約日期
                            </label>
                            <input
                                type="date"
                                className="input-field h-10"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> 時間段
                            </label>
                            <select
                                className="input-field h-10"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                required
                            >
                                {Array.from({ length: 20 }).map((_, i) => {
                                    const h = Math.floor(i / 2) + 9
                                    const m = (i % 2) * 30
                                    const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                                    return <option key={t} value={t}>{t}</option>
                                })}
                            </select>
                        </div>
                    </div>

                    {/* Type & Notes */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">診別</label>
                            <div className="flex gap-2">
                                {['initial', 'followup'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t as any)}
                                        className={`flex-1 py-2 text-xs font-bold border rounded-sm transition-all ${type === t
                                            ? 'bg-theme-primary text-white border-theme-primary'
                                            : 'bg-theme-surface text-theme-text-muted border-theme-border hover:bg-theme-surface-alt'
                                            }`}
                                    >
                                        {t === 'initial' ? '初診' : '覆診'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">備註</label>
                            <textarea
                                className="input-field min-h-[60px] py-2 resize-none text-sm"
                                placeholder="備註特殊情況..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-theme-border bg-theme-surface-alt/30 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary flex-1 h-10 font-bold"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading || !doctorId || (!selectedPatient && !isNewPatient)}
                        className="btn-primary flex-1 h-10 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : '確認預約與建檔'}
                    </button>
                </div>
            </div>
        </div>
    )
}