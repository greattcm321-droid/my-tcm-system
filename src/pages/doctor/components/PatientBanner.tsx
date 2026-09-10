import React, { useState } from 'react';
import { User, ShieldAlert, Loader2, ChevronLeft, Save, X as CloseIcon } from 'lucide-react';
import type { Patient } from '../../../types';
import { patientService } from '../../../services/patientService';

interface PatientBannerProps {
    patient: Patient | null;
    loading?: boolean;
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    // Callback after patient data is updated (e.g., allergies or medical history)
    onPatientUpdate?: (updatedFields: Partial<Patient>) => Promise<void>;
}

const PatientBanner: React.FC<PatientBannerProps> = ({
    patient,
    loading,
    isSidebarOpen,
    onToggleSidebar,
    onPatientUpdate,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editAllergies, setEditAllergies] = useState('');
    const [editHistory, setEditHistory] = useState('');
    const [saving, setSaving] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-3 rounded-lg border bg-theme-surface border-theme-border h-[60px]">
                <Loader2 className="animate-spin text-theme-primary mr-2" size={18} />
                <span className="text-sm text-theme-text-muted">正在載入病患資料...</span>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-theme-surface border-theme-border h-[60px]">
                <span className="text-sm text-theme-text-muted italic px-2">尚未選擇病患</span>
            </div>
        );
    }

    // 計算年齡
    const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : '??';

    const openEdit = () => {
        setEditAllergies(patient.allergies?.join(', ') || '');
        setEditHistory(patient.medicalHistory || patient.medical_history || '');
        setIsEditing(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const allergiesArr = editAllergies.split(',').map(s => s.trim()).filter(Boolean);
            // Update patient via service if patient exists
            if (patient?.id) {
                await patientService.update(patient.id, {
                    allergies: allergiesArr,
                    medicalHistory: editHistory,
                    medical_history: editHistory,
                });
                // Notify parent component of the change
                await onPatientUpdate?.({
                    allergies: allergiesArr,
                    medicalHistory: editHistory,
                    medical_history: editHistory,
                });
            }
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to update patient banner info:", e);
        } finally {
            setSaving(false);
        }
    };

    const firstLineAllergies = (patient.allergies?.join(', ') || '無').split('\n')[0];
    const firstLineHistory = (patient.medicalHistory || patient.medical_history || '無').split('\n')[0];

    return (
        <div className="flex flex-row items-center justify-between shrink-0 px-2.5 py-1 gap-2 rounded-sm border bg-theme-surface border-theme-border shadow-sm relative text-xs w-full">
            <div className="flex flex-row items-center gap-3 overflow-hidden flex-1 min-w-0">
                <div className="w-7 h-7 rounded-sm bg-theme-primary/10 flex items-center justify-center text-theme-primary font-bold shadow-inner shrink-0">
                    <User size={14} />
                </div>

                <div className="flex flex-row items-center gap-3 overflow-hidden flex-1 min-w-0">
                    <h2 className="text-sm font-black text-theme-text shrink-0">{patient.name}</h2>
                    
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-theme-bg text-theme-text-muted border-theme-border shrink-0 uppercase tracking-tight">
                        {patient.gender === 'male' ? '男' : '女'} / {age}歲
                    </span>
                    
                    {/* G6PD Checkbox */}
                    <label className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 cursor-pointer hover:bg-red-100 transition-colors select-none shrink-0">
                        <input
                            type="checkbox"
                            checked={!!patient.g6pd}
                            onChange={(e) => onPatientUpdate?.({ g6pd: e.target.checked })}
                            className="rounded text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                        />
                        G6PD
                    </label>

                    {/* Pregnancy Checkbox */}
                    {patient.gender !== 'male' && (
                        <label className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors select-none shrink-0">
                            <input
                                type="checkbox"
                                checked={!!patient.pregnant}
                                onChange={(e) => onPatientUpdate?.({ pregnant: e.target.checked })}
                                className="rounded text-purple-600 focus:ring-purple-500 w-3 h-3 cursor-pointer"
                            />
                            懷孕
                        </label>
                    )}

                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-theme-primary/5 text-theme-primary border border-theme-primary/20 shrink-0">
                        NO: {patient.id?.slice(-8).toUpperCase()}
                    </span>

                    <span className="text-theme-border shrink-0">|</span>

                    {/* Clickable Allergies Display */}
                    <button
                        onClick={openEdit}
                        className={`flex items-center gap-1 text-[11px] border rounded px-1.5 py-0.5 font-bold transition-all text-left max-w-[150px] truncate shrink-0 ${
                            patient.allergies && patient.allergies.length > 0
                                ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200 animate-pulse'
                                : 'text-theme-text-muted bg-theme-bg hover:bg-theme-border/30 border-theme-border'
                        }`}
                        title="點擊編輯過敏史"
                    >
                        <ShieldAlert size={11} className="shrink-0" />
                        過敏：{firstLineAllergies}
                    </button>

                    {/* Clickable Past History Display */}
                    <button
                        onClick={openEdit}
                        className="flex items-center gap-1 text-[11px] text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded px-1.5 py-0.5 font-bold transition-all text-left max-w-[200px] truncate shrink-0"
                        title="點擊編輯既往史"
                    >
                        既往史：{firstLineHistory}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest">Medical Record</span>
                    <span className="text-[11px] font-bold text-theme-text leading-none mt-0.5">{patient.id}</span>
                </div>
                {!isSidebarOpen && onToggleSidebar && (
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 rounded-lg text-theme-primary bg-theme-primary/5 border border-theme-primary/20 hover:bg-theme-primary/10 transition-colors tooltip"
                        title="展開知識庫"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* Edit Allergies & Past History Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-theme-surface border border-theme-border rounded-sm shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-3 border-b border-theme-border bg-theme-bg/50">
                            <h3 className="text-sm font-bold text-theme-text">編輯病患病史資料</h3>
                            <button onClick={() => setIsEditing(false)} className="text-theme-text-muted hover:text-theme-text">
                                <CloseIcon size={16} />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text-muted">過敏史 (多個過敏源請用逗號分隔)</label>
                                <input
                                    type="text"
                                    value={editAllergies}
                                    onChange={(e) => setEditAllergies(e.target.value)}
                                    className="w-full bg-theme-bg border border-theme-border rounded p-2 text-sm text-theme-text focus:border-theme-primary outline-none"
                                    placeholder="無"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-theme-text-muted">既往史 (Past Medical History)</label>
                                <textarea
                                    value={editHistory}
                                    onChange={(e) => setEditHistory(e.target.value)}
                                    rows={4}
                                    className="w-full bg-theme-bg border border-theme-border rounded p-2 text-sm text-theme-text focus:border-theme-primary outline-none resize-none"
                                    placeholder="無"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-3 border-t border-theme-border bg-theme-bg/30">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 text-xs text-theme-text border border-theme-border hover:bg-theme-bg rounded-sm font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-3 py-1.5 text-xs text-white bg-theme-primary hover:bg-theme-primary/95 rounded-sm font-bold flex items-center gap-1"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                儲存變更
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientBanner;