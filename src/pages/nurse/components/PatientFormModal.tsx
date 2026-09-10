import React, { useState, useEffect } from 'react'
import {
    X, User, MapPin,
    AlertTriangle, ClipboardList, BadgeCheck, Save, Loader2, UserPlus
} from 'lucide-react'

import { patientService } from '../../../services/patientService'
import type { Patient } from '../../../types'

interface PatientFormModalProps {
    isOpen: boolean
    onClose: () => void
    clinicId: string
    initialData?: Patient // 若傳入則為編輯模式
    onSuccess?: () => void
}

const EMPTY_FORM = {
    name: '',
    phone: '',
    gender: 'female' as 'male' | 'female' | 'other',
    dob: '',
    hkid: '',
    idCardNumber: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    medical_history: '',
    voucherEligible: false,
    voucherBalance: 0,
}

export default function PatientFormModal({
    isOpen, onClose, clinicId, initialData, onSuccess
}: PatientFormModalProps) {
    const isEdit = !!initialData
    const [form, setForm] = useState(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)

    // 當 initialData 改變（切換不同病患編輯）或 Modal 開啟時，重設表單
    useEffect(() => {
        if (isOpen && initialData) {
            setForm({
                name: initialData.name || '',
                phone: initialData.phone || '',
                gender: initialData.gender || 'female',
                dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : '',
                hkid: initialData.hkid || '',
                idCardNumber: initialData.idCardNumber || '',
                email: initialData.email || '',
                address: initialData.address || '',
                emergencyContactName: initialData.emergencyContactName || '',
                emergencyContactPhone: initialData.emergencyContactPhone || '',
                allergies: initialData.allergies?.join('、') || '',
                medical_history: initialData.medical_history || '',
                voucherEligible: initialData.voucherEligible || false,
                voucherBalance: initialData.voucherBalance || 0,
            })
        } else if (isOpen && !initialData) {
            setForm(EMPTY_FORM)
        }
    }, [isOpen, initialData])

    const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const payload: Omit<Patient, 'id' | 'clinicId' | 'createdAt'> = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                gender: form.gender,
                dob: new Date(form.dob).toISOString(),
                hkid: form.hkid.trim() || undefined,
                idCardNumber: form.idCardNumber.trim() || undefined,
                email: form.email.trim() || undefined,
                address: form.address.trim() || undefined,
                emergencyContactName: form.emergencyContactName.trim() || undefined,
                emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
                allergies: form.allergies.split(/[,，、\n]+/).map(s => s.trim()).filter(Boolean),
                medical_history: form.medical_history.trim(),
                voucherEligible: form.voucherEligible,
                voucherBalance: form.voucherEligible ? form.voucherBalance : undefined,
            }

            if (isEdit && initialData?.id) {
                await patientService.update(initialData.id, payload)
            } else {
                await patientService.create(clinicId, payload)
            }

            onSuccess?.()
            onClose()
        } catch (err) {
            console.error('病患儲存失敗:', err)
            alert('儲存失敗，請檢查網路或欄位填寫。')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    const SectionTitle = ({ icon: Icon, label }: { icon: any; label: string }) => (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-theme-border">
            <Icon size={14} className="text-theme-primary" />
            <span className="text-xs font-bold text-theme-primary uppercase tracking-widest">{label}</span>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-theme-surface border border-theme-border w-full max-w-2xl max-h-[90vh] rounded-sm shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-theme-border bg-theme-bg/60 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-theme-primary/10 rounded-sm">
                            <UserPlus size={16} className="text-theme-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-theme-text">
                                {isEdit ? `修改病患資料 — ${initialData?.name}` : '登記新病患'}
                            </h2>
                            <p className="text-[10px] text-theme-text-muted uppercase tracking-wider">
                                {isEdit ? 'Edit Patient Profile' : 'New Patient Registration'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-theme-border rounded-sm transition-colors">
                        <X size={18} className="text-theme-text-muted" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* 基本資料 */}
                    <div>
                        <SectionTitle icon={User} label="基本資料" />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-theme-text">姓名 <span className="text-red-500">*</span></label>
                                <input required className="input-field text-sm" placeholder="病患全名" value={form.name} onChange={e => set('name', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">性別</label>
                                <select className="input-field text-sm" value={form.gender} onChange={e => set('gender', e.target.value)}>
                                    <option value="female">女</option>
                                    <option value="male">男</option>
                                    <option value="other">其他</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">出生日期 <span className="text-red-500">*</span></label>
                                <input required type="date" className="input-field text-sm" value={form.dob} onChange={e => set('dob', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">聯絡電話 <span className="text-red-500">*</span></label>
                                <input required className="input-field text-sm" placeholder="例: 9XXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">身份證字號 (HKID)</label>
                                <input className="input-field text-sm font-mono" placeholder="例: A123456(7)" value={form.hkid} onChange={e => set('hkid', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">身份證/護照號碼 (通用)</label>
                                <input className="input-field text-sm font-mono" placeholder="ID Card / Passport" value={form.idCardNumber} onChange={e => set('idCardNumber', e.target.value)} />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-bold text-theme-text">電郵地址</label>
                                <input type="email" className="input-field text-sm" placeholder="example@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* 聯絡資訊 */}
                    <div>
                        <SectionTitle icon={MapPin} label="聯絡資訊" />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-bold text-theme-text">地址</label>
                                <input className="input-field text-sm" placeholder="住宅地址" value={form.address} onChange={e => set('address', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">緊急聯絡人姓名</label>
                                <input className="input-field text-sm" placeholder="聯絡人全名" value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">緊急聯絡人電話</label>
                                <input className="input-field text-sm" placeholder="緊急聯絡電話" value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* 醫療記錄 */}
                    <div>
                        <SectionTitle icon={ClipboardList} label="醫療記錄" />
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-red-600 flex items-center gap-1">
                                    <AlertTriangle size={11} /> 過敏史 (Allergies)
                                </label>
                                <textarea
                                    className="input-field text-sm min-h-[60px] border-red-100 focus:border-red-400"
                                    placeholder="例: 阿司匹林、青黴素。多項請用逗號或換行分隔"
                                    value={form.allergies}
                                    onChange={e => set('allergies', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text">長期病患 / 既往史</label>
                                <textarea
                                    className="input-field text-sm min-h-[80px]"
                                    placeholder="糖尿病、高血壓、手術史、家族病史等..."
                                    value={form.medical_history}
                                    onChange={e => set('medical_history', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 醫療券設定 */}
                    <div>
                        <SectionTitle icon={BadgeCheck} label="醫療券設定 (長者醫療券)" />
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.voucherEligible ? 'bg-emerald-500' : 'bg-theme-border'}`}
                                    onClick={() => set('voucherEligible', !form.voucherEligible)}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.voucherEligible ? 'translate-x-5' : ''}`} />
                                </div>
                                <span className="text-sm font-medium text-theme-text">符合長者醫療券資格</span>
                            </label>
                            {form.voucherEligible && (
                                <div className="space-y-1 pl-2 border-l-2 border-emerald-300 animate-fade-in">
                                    <label className="text-xs font-bold text-emerald-700">目前醫療券餘額 (HKD)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-theme-text-muted font-bold">HK$</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={50}
                                            className="input-field text-sm w-40 font-mono"
                                            placeholder="例: 2000"
                                            value={form.voucherBalance}
                                            onChange={e => set('voucherBalance', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-theme-text-muted">此金額將在護士收銀時作為可用餘額基準，每次交易需記錄憑單編號。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-theme-border bg-theme-bg/30 flex gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-sm border border-theme-border text-theme-text font-bold text-sm hover:bg-theme-surface-alt transition-colors">
                        取消
                    </button>
                    <button
                        onClick={handleSubmit as any}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-sm bg-theme-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isEdit ? '儲存修改' : '確認登記'}
                    </button>
                </div>
            </div>
        </div>
    )
}
