import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Loader2, ArrowLeft, History, CheckCircle2,
    X, Save, AlertTriangle, User, Plus, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import PatientBanner from './components/PatientBanner';
import TreatmentTabs from './components/TreatmentTabs';
import MateriaMedicaSidebar from './components/MateriaMedicaSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { consultationService } from '../../services/consultationService';
import { patientService } from '../../services/patientService';
import { useConsultation } from '../../contexts/ConsultationContext';
import type { Consultation, Patient } from '../../types';

// ==========================================
// Helper Components & Functions
// ==========================================

// 1. 動態生成病歷摘要字串
const buildHistorySummary = (notes: any) => {
    if (!notes) return '無病歷紀錄';
    const parts = [
        { text: notes.chiefComplaint, bold: false },
        { text: notes.present_illness, bold: false },
        { text: notes.observation, bold: false },
        { text: notes.tongue, bold: false },
        { text: notes.pulse, bold: false },
        { text: notes.diagnosis, bold: true },
        { text: notes.treatmentPrinciple || notes.treatmentPlan, bold: true }
    ];

    const validParts = parts.filter(p => p.text && typeof p.text === 'string' && p.text.trim());
    if (validParts.length === 0) return '無病歷紀錄';

    return validParts.map((p, i) => (
        <React.Fragment key={i}>
            {p.bold ? <span className="font-bold text-theme-text">{p.text}</span> : p.text}
            {i < validParts.length - 1 && '。'}
        </React.Fragment>
    ));
};

// 2. 共用操作確認彈窗
const ActionModal = ({ isOpen, icon: Icon, iconColor, title, desc, cancelText, confirmText, confirmColor, onCancel, onConfirm }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 no-print">
            <div className="bg-theme-surface w-full max-w-md rounded-2xl shadow-2xl p-6 border border-theme-border text-center">
                <Icon className={`mx-auto mb-4 ${iconColor}`} size={48} />
                <h2 className="text-xl font-bold mb-2">{title}</h2>
                <p className="text-theme-text-muted mb-6 text-sm">{desc}</p>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-3 bg-theme-bg border border-theme-border rounded-xl font-bold">{cancelText}</button>
                    <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold ${confirmColor}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// 3. 四診輸入框設定檔
const TCM_FIELDS = [
    { key: 'chiefComplaint', label: '主訴 (Chief Complaint)', placeholder: '如：咳嗽三日...' },
    { key: 'observation', label: '望診', placeholder: '望診與現在症狀...' },
    { key: 'tongue', label: '舌診 (Tongue)', placeholder: '舌苔、舌質...' },
    { key: 'pulse', label: '脈診 (Pulse)', placeholder: '脈象...' },
    { key: 'diagnosis', label: '中醫診斷 (Diagnosis)', placeholder: '證型 / 病名...' },
    { key: 'treatmentPrinciple', label: '治則治法 (Principle)', placeholder: '治法...' }
];


// ==========================================
// Main Component
// ==========================================
export default function ConsultationView() {
    const { id: urlAppointmentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const clinicId = userProfile?.clinicId || '';

    // Context Multi-tab States
    const {
        sessions, activeTabId, loadingSessionId, setActiveTabId,
        loadSession, updateSession, closeTab, markSaved
    } = useConsultation();

    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Common UI States
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null);

    // Layout States
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
    const [historyDetailTab, setHistoryDetailTab] = useState<'prescription' | 'acupuncture'>('prescription');
    const [incomingHerb, setIncomingHerb] = useState('');

    const activeSession = sessions[activeTabId];

    // Load active session details
    useEffect(() => {
        if (!urlAppointmentId || !clinicId) return;
        loadSession(urlAppointmentId, clinicId);
    }, [urlAppointmentId, clinicId, loadSession]);

    // Reset selected history record when tab changes
    useEffect(() => {
        setSelectedHistoryIndex(null);
    }, [activeTabId]);

    const updateActiveSession = (update: any) => {
        if (activeTabId) updateSession(activeTabId, update);
    };

    const handleCloseTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (sessions[id]?.isModified) setShowCloseConfirm(id);
        else closeTab(id);
    };

    const forceCloseTab = (id: string) => {
        closeTab(id, true);
        setShowCloseConfirm(null);
    };

    // Quick add herb from drawer
    const handleQuickAddHerb = (herb: any) => {
        if (!activeSession) return;
        const updatedFormulas = [...activeSession.formulas];
        if (updatedFormulas.length === 0) {
            updatedFormulas.push({ id: `formula_${Date.now()}`, name: '處方 1', days: 3, dosesPerDay: 2, herbs: [] });
        }

        const targetFormula = updatedFormulas[0];
        if (targetFormula.herbs.some(h => h.name === herb.name)) {
            setSuccessMessage(`「${herb.name}」已在處方中`);
            setTimeout(() => setSuccessMessage(null), 1500);
            return;
        }

        targetFormula.herbs.push({
            id: `herb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: herb.name, form: '農本方', dosage: '', unit: '克',
            concentration: '5:1', stock: String(herb.stockGrams ?? '-'),
            instruction: '常規', safeLimit: '無',
        });

        updateActiveSession({ formulas: updatedFormulas });
        setSuccessMessage(`已將「${herb.name}」加入處方`);
        setTimeout(() => setSuccessMessage(null), 1500);
    };

    // Clone historical recipe
    const handleApplyHistory = (hist: Consultation, mode: 'all' | 'prescription' | 'acupuncture' | 'notes' = 'all') => {
        if (!activeSession) return;
        const updates: any = {};

        if (mode === 'all' || mode === 'notes') {
            updates.notes = {
                ...(activeSession.notes || {}),
                chiefComplaint: hist?.clinicalNotes?.chiefComplaint || activeSession?.notes?.chiefComplaint || '',
                present_illness: hist?.clinicalNotes?.present_illness || activeSession?.notes?.present_illness || '',
                observation: hist?.clinicalNotes?.observation || activeSession?.notes?.observation || '',
                tongue: hist?.clinicalNotes?.tongue || activeSession?.notes?.tongue || '',
                pulse: hist?.clinicalNotes?.pulse || activeSession?.notes?.pulse || '',
                diagnosis: hist?.clinicalNotes?.diagnosis || activeSession?.notes?.diagnosis || '',
                treatmentPrinciple: hist?.clinicalNotes?.treatmentPrinciple || hist?.clinicalNotes?.treatmentPlan || activeSession?.notes?.treatmentPrinciple || '',
            };
        }

        if (mode === 'all' || mode === 'prescription') {
            updates.formulas = hist.prescription?.formulas?.map((f: any, idx: number) => ({
                id: `applied_${idx}_${Date.now()}`, name: `處方 ${idx + 1}`,
                days: f.days ?? 3, dosesPerDay: f.dosesPerDay ?? 2,
                herbs: f.herbItems?.map((h: any, hIdx: number) => ({
                    id: `applied_h_${idx}_${hIdx}_${Date.now()}`, name: h.name ?? '',
                    dosage: h.dosage != null ? String(h.dosage) : '', unit: h.unit ?? '克',
                    form: '農本方', concentration: '5:1', stock: '-', instruction: h.instruction ?? '常規', safeLimit: '無'
                })) || []
            })) || [];
            updates.advice = hist.prescription?.advice ?? '';
            updates.contraindications = hist.prescription?.contraindications ?? '';
        }

        if (mode === 'all' || mode === 'acupuncture') {
            updates.acupoints = hist.acupuncture?.map((a: any, idx: number) => ({
                id: `applied_acu_${idx}_${Date.now()}`, meridian: a.meridian, acupoint: a.acupoint, method: a.method, location: a.location
            })) || [];
            updates.otherTreatments = hist.otherTreatments ?? '';
        }

        updateActiveSession(updates);
        setSuccessMessage(`已套用歷史${mode === 'prescription' ? '處方' : mode === 'acupuncture' ? '針灸' : '處方與治療方案'}！`);
        setTimeout(() => setSuccessMessage(null), 1500);
    };

    const handlePatientUpdate = async (updatedFields: Partial<Patient>) => {
        if (!activeSession?.patient?.id) return;
        await patientService.update(activeSession.patient.id, updatedFields);
        updateActiveSession((prev: any) => ({ ...prev, patient: { ...prev.patient, ...updatedFields } }));
    };

    const handleSave = async (isClosing: boolean) => {
        if (!activeSession) return;
        setShowConfirmModal(false);
        setSaving(true);

        try {
            const validAcupoints = activeSession.acupoints.filter(a => a.meridian.trim() !== '' || a.acupoint.trim() !== '');
            const activeBillingItems = activeSession.billingItems.filter(b => b.active).map(b => ({ name: b.name, price: b.price, qty: b.qty }));

            if (!activeSession.patient.id) {
                alert("病患 ID 無效，無法儲存。");
                return;
            }

            const dataToSave = {
                appointmentId: activeSession.appointmentId,
                patientId: activeSession.patient.id,
                doctorId: userProfile?.id || '',
                clinicalNotes: { ...activeSession.notes, treatmentPlan: activeSession.formulas.map(f => f.name).join(', ') },
                prescription: {
                    formulas: activeSession.formulas.map(f => ({
                        herbItems: f.herbs.map(h => ({ name: h.name, dosage: parseFloat(h.dosage) || 0, unit: h.unit, instruction: h.instruction })),
                        days: Number(f.days) || 0, dosesPerDay: Number(f.dosesPerDay) || 0
                    })),
                    totalDays: activeSession.formulas.reduce((s, f) => s + (Number(f.days) || 0), 0),
                    advice: activeSession.advice,
                    contraindications: activeSession.contraindications
                },
                acupuncture: validAcupoints.map(({ meridian, acupoint, method, location }) => ({ meridian, acupoint, method, location })),
                otherTreatments: activeSession.otherTreatments,
                billing: activeBillingItems,
                status: isClosing ? 'completed' : 'draft' as 'completed' | 'draft'
            };

            await consultationService.save(clinicId, dataToSave);
            const freshHistory = await consultationService.getPatientHistory(clinicId, activeSession.patient.id!);
            updateActiveSession({ history: freshHistory });

            if (isClosing) {
                await appointmentService.update(activeSession.appointmentId, {
                    clinicId: clinicId, patientId: activeSession.patient.id, doctorId: userProfile?.id,
                    status: 'completed', dispenseStatus: 'pending', paymentStatus: 'pending'
                });
                setSuccessMessage("看診已結束，病歷已封存。");
                setTimeout(() => forceCloseTab(activeTabId), 1500);
            } else {
                markSaved(activeTabId);
                setSuccessMessage("暫存成功！");
                setTimeout(() => setSuccessMessage(null), 2000);
            }
        } catch (err) {
            console.error("儲存失敗:", err);
            alert("存儲失敗。");
        } finally {
            setSaving(false);
        }
    };

    if (loadingSessionId && Object.keys(sessions).length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-theme-bg h-full">
                <Loader2 className="animate-spin text-theme-primary mb-4" size={48} />
                <h3 className="text-lg font-bold text-theme-text">正在加載 HIS 臨床數據...</h3>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-56px)] flex flex-col bg-theme-bg overflow-hidden -m-5 lg:-m-6 relative">
            {successMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-in border border-white/20">
                    <CheckCircle2 size={24} />
                    <span className="font-bold text-lg">{successMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="shrink-0 px-4 py-1.5 h-12 border-b border-theme-border flex items-center justify-between bg-theme-surface z-10 no-print">
                <div className="flex items-center gap-4 shrink-0">
                    <button onClick={() => navigate('/doctor')} className="p-2 hover:bg-theme-bg rounded-lg transition-colors text-theme-text-muted">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-base font-black text-theme-text flex items-center gap-2 whitespace-nowrap">中醫診室</h1>
                </div>

                <div className="flex-1 flex items-center justify-start px-8 overflow-x-auto no-print custom-scrollbar">
                    <div className="flex items-center gap-1 bg-theme-bg/60 p-1 rounded-lg border border-theme-border">
                        {Object.values(sessions).map(session => (
                            <div
                                key={session.appointmentId}
                                onClick={() => {
                                    setActiveTabId(session.appointmentId);
                                    navigate(`/doctor/consultation/${session.appointmentId}`);
                                }}
                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all text-xs font-bold whitespace-nowrap
                                    ${activeTabId === session.appointmentId ? 'bg-theme-surface text-theme-primary shadow-xs border border-theme-border/80' : 'text-theme-text-muted hover:bg-theme-surface/50 border border-transparent'}`}
                            >
                                <User size={12} className={activeTabId === session.appointmentId ? 'text-theme-primary' : 'opacity-50'} />
                                <span>{session.patient.name}</span>
                                {session.isModified && <div className="w-1.5 h-1.5 rounded-full bg-theme-primary shrink-0" />}
                                <button
                                    onClick={(e) => handleCloseTab(session.appointmentId, e)}
                                    className="ml-1.5 p-0.5 rounded-full hover:bg-theme-border opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-theme-surface border border-theme-border text-theme-text rounded hover:bg-theme-bg transition-all shadow-xs">
                        <History size={14} /> 歷史總覽
                    </button>
                    <button onClick={() => { setSuccessMessage('已成功產生並列印病假證明書！'); setTimeout(() => setSuccessMessage(null), 2000); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-theme-surface border border-amber-600 text-amber-700 rounded hover:bg-amber-50 transition-all shadow-xs">
                        <FileText size={14} /> 開立病假
                    </button>
                    <button onClick={() => handleSave(false)} disabled={saving || !activeSession} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-theme-surface border border-theme-primary text-theme-primary rounded hover:bg-theme-primary/5 transition-all shadow-xs disabled:opacity-50">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />} 暫存病歷
                    </button>
                    <button onClick={() => setShowConfirmModal(true)} disabled={saving || !activeSession} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-theme-primary text-white rounded hover:bg-theme-primary/90 transition-all shadow-xs disabled:opacity-50">
                        <CheckCircle2 size={14} /> 結束看診
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            {activeSession ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-theme-bg">

                    {/* Top Half */}
                    <div className="flex-1 grid lg:grid-cols-[70%_30%] min-h-0 border-b border-theme-border">
                        <div className="border-r border-theme-border p-4 flex flex-col gap-4 bg-theme-surface-alt/5 min-w-0">
                            <div className="bg-theme-surface border border-theme-border rounded-lg p-2 shadow-xs shrink-0">
                                <PatientBanner patient={activeSession.patient} loading={false} onPatientUpdate={handlePatientUpdate} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                                <div className="bg-theme-surface border border-theme-border rounded-lg p-3 shadow-xs flex flex-col gap-2">
                                    <label className="text-sm font-bold text-theme-text-muted uppercase tracking-wider shrink-0">現在症</label>
                                    <textarea
                                        className="text-lg font-medium resize-none w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-theme-text outline-none transition-all duration-300 focus:border-theme-primary flex-1 min-h-[120px]"
                                        value={activeSession.notes.present_illness || ''}
                                        onChange={e => updateActiveSession((prev: any) => ({ ...prev, notes: { ...prev.notes, present_illness: e.target.value } }))}
                                        placeholder="請記錄病患的現病史起因、經過、現狀等..."
                                    />
                                </div>

                                <div className="bg-theme-surface border border-theme-border rounded-lg p-3 shadow-xs flex flex-col gap-3">
                                    <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider border-b border-theme-border pb-1.5 shrink-0">中醫理法 (四診)</h3>

                                    {/* 透過設定檔動態渲染 6 個四診輸入框 */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {TCM_FIELDS.map(field => (
                                            <div key={field.key} className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-theme-text-muted">{field.label}</label>
                                                <input
                                                    type="text"
                                                    className="py-2 text-sm h-10 w-full bg-theme-bg border border-theme-border rounded-lg px-3 text-theme-text outline-none focus:border-theme-primary transition-colors"
                                                    value={(activeSession.notes as Record<string, string>)[field.key] || ''}
                                                    onChange={e => updateActiveSession((prev: any) => ({ ...prev, notes: { ...prev.notes, [field.key]: e.target.value } }))}
                                                    placeholder={field.placeholder}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History Records */}
                        <div className="flex flex-col h-full bg-theme-surface min-w-0 overflow-hidden">
                            <div className="shrink-0 px-4 py-2 bg-theme-surface border-b border-theme-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
                                        <History size={14} className="text-theme-primary" /> 歷次就診記錄
                                    </h3>
                                    <span className="text-[10px] bg-theme-bg px-2 py-0.5 rounded-full border border-theme-border text-theme-text-muted font-bold">
                                        共 {activeSession.history?.length || 0} 次
                                    </span>
                                </div>
                                {selectedHistoryIndex !== null && activeSession.history?.[selectedHistoryIndex] && (
                                    <button onClick={() => handleApplyHistory(activeSession.history![selectedHistoryIndex], 'notes')} className="text-[10px] flex items-center gap-1 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white px-2 py-0.5 rounded transition-colors font-bold border border-theme-primary/20">
                                        <Plus size={12} /> 貼上病歷
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
                                {activeSession.history && activeSession.history.length > 0 ? (
                                    activeSession.history.map((hist, idx) => (
                                        <div
                                            key={hist.id || idx}
                                            onClick={() => setSelectedHistoryIndex(idx)}
                                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${selectedHistoryIndex === idx ? 'bg-theme-primary/5 border-theme-primary shadow-xs' : 'bg-theme-bg border-theme-border hover:bg-theme-surface-alt/45'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-theme-text text-xs">
                                                    {hist.createdAt ? new Date(hist.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '未指定日期'}
                                                </span>
                                            </div>
                                            <div className="text-base text-theme-text-muted mt-1 line-clamp-4 leading-relaxed font-medium">
                                                {buildHistorySummary(hist.clinicalNotes)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-theme-text-muted text-xs">暫無歷史就診記錄</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Half */}
                    <div className="flex-1 grid lg:grid-cols-[70%_30%] min-h-0 overflow-hidden">
                        <div className="p-4 border-r border-theme-border overflow-y-auto custom-scrollbar min-w-0">
                            <TreatmentTabs
                                formulas={activeSession.formulas} onFormulasChange={(f) => updateActiveSession({ formulas: f })}
                                advice={activeSession.advice} onAdviceChange={(a) => updateActiveSession({ advice: a })}
                                contraindications={activeSession.contraindications} onContraindicationsChange={(c) => updateActiveSession({ contraindications: c })}
                                incomingHerb={incomingHerb} onHerbAdded={() => setIncomingHerb('')}
                                acupoints={activeSession.acupoints} onAcupointsChange={(a) => updateActiveSession({ acupoints: a })}
                                otherTreatments={activeSession.otherTreatments} onOtherTreatmentsChange={(o) => updateActiveSession({ otherTreatments: o })}
                                billingItems={activeSession.billingItems} onBillingItemsChange={(b) => updateActiveSession({ billingItems: b })}
                                patient={activeSession.patient} diagnosis={activeSession.notes.diagnosis}
                                doctorName={userProfile?.displayName} clinicName="智醫中醫診所"
                            />
                        </div>

                        <div className="flex flex-col bg-theme-bg/30 overflow-hidden min-w-0 shrink-0">
                            <div className="shrink-0 px-4 py-2 bg-theme-surface border-b border-theme-border flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setHistoryDetailTab('prescription')} className={`px-3 py-1 text-sm font-bold rounded-lg transition-all ${historyDetailTab === 'prescription' ? 'bg-theme-primary/10 text-theme-primary' : 'text-theme-text-muted hover:bg-theme-surface-alt hover:text-theme-text'}`}>處方</button>
                                    <button onClick={() => setHistoryDetailTab('acupuncture')} className={`px-3 py-1 text-sm font-bold rounded-lg transition-all ${historyDetailTab === 'acupuncture' ? 'bg-theme-primary/10 text-theme-primary' : 'text-theme-text-muted hover:bg-theme-surface-alt hover:text-theme-text'}`}>針灸</button>
                                    {selectedHistoryIndex !== null && activeSession.history?.[selectedHistoryIndex] && (
                                        <button onClick={() => handleApplyHistory(activeSession.history![selectedHistoryIndex], historyDetailTab)} className="ml-1 text-[11px] flex items-center gap-1 bg-theme-primary text-white hover:bg-theme-primary-light px-2.5 py-1 rounded-lg transition-all font-bold shadow-xs">
                                            <Plus size={14} /> 貼上
                                        </button>
                                    )}
                                </div>
                                {selectedHistoryIndex !== null && activeSession.history?.[selectedHistoryIndex] && (
                                    <div className="flex items-center bg-theme-bg rounded-lg border border-theme-border p-0.5">
                                        <button onClick={() => setSelectedHistoryIndex(Math.max(0, selectedHistoryIndex - 1))} disabled={selectedHistoryIndex === 0} className="p-1 rounded text-theme-text-muted hover:bg-theme-surface-alt hover:text-theme-text disabled:opacity-30">
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button onClick={() => setSelectedHistoryIndex(Math.min((activeSession.history?.length || 1) - 1, selectedHistoryIndex + 1))} disabled={selectedHistoryIndex === (activeSession.history?.length || 1) - 1} className="p-1 rounded text-theme-text-muted hover:bg-theme-surface-alt hover:text-theme-text disabled:opacity-30">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 text-xs">
                                {selectedHistoryIndex !== null && activeSession.history?.[selectedHistoryIndex] ? (
                                    <HistoryDetailView consultation={activeSession.history[selectedHistoryIndex]} activeTab={historyDetailTab} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-theme-text-muted text-center p-6">請點擊上方就診記錄以查看細節</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-theme-text-muted"><Loader2 className="animate-spin mb-2" /><p>正在載入工作區...</p></div>
            )}

            {/* Floating Drawer Trigger */}
            {activeSession && (
                <button onClick={() => setDrawerOpen(true)} className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-theme-primary text-white px-2 py-4 rounded-l-xl shadow-lg border border-r-0 border-white/20 flex flex-col items-center gap-1.5 hover:bg-theme-primary-light transition-all text-[11px] font-black tracking-widest cursor-pointer" style={{ writingMode: 'vertical-rl' }}>
                    📚 藥典資料庫
                </button>
            )}

            {/* Drawer */}
            {drawerOpen && <div className="fixed inset-0 z-[45] bg-black/45 backdrop-blur-xs no-print transition-opacity" onClick={() => setDrawerOpen(false)} />}
            <div className={`fixed top-0 right-0 h-full w-[380px] z-[50] bg-theme-surface border-l border-theme-border shadow-2xl transition-transform duration-300 ease-out no-print flex flex-col ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="shrink-0 p-4 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt/30">
                    <h3 className="font-black text-xs text-theme-text flex items-center gap-1.5 uppercase tracking-wider">📚 中藥配方藥典</h3>
                    <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-theme-bg rounded-lg text-theme-text-muted"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <MateriaMedicaSidebar onAddHerb={handleQuickAddHerb} />
                </div>
            </div>

            {/* Action Modals */}
            <ActionModal
                isOpen={!!showCloseConfirm} icon={AlertTriangle} iconColor="text-amber-500" title="確定關閉頁籤？"
                desc={`病患 ${sessions[showCloseConfirm as string]?.patient.name} 的資料尚未暫存，關閉將遺失修改內容。`}
                cancelText="取消" confirmText="確定關閉" confirmColor="bg-red-600"
                onCancel={() => setShowCloseConfirm(null)} onConfirm={() => forceCloseTab(showCloseConfirm as string)}
            />

            <ActionModal
                isOpen={showConfirmModal} icon={CheckCircle2} iconColor="text-theme-primary" title="確認結束看診？"
                desc="結束後病歷將封存並發送至前台。" cancelText="返回" confirmText="確定結束" confirmColor="bg-theme-primary"
                onCancel={() => setShowConfirmModal(false)} onConfirm={() => handleSave(true)}
            />

            {/* Legacy History Modal */}
            {showHistoryModal && activeSession && (
                <HistoryModal patient={activeSession.patient} history={activeSession.history} onClose={() => setShowHistoryModal(false)} onApply={handleApplyHistory} />
            )}
        </div>
    );
}

// ==========================================
// Subcomponents (Ideally moved to separate files in future)
// ==========================================

function HistoryDetailView({ consultation, activeTab }: { consultation: Consultation; activeTab: 'prescription' | 'acupuncture'; }) {
    return (
        <div className="flex flex-col h-full relative">
            <div className="flex flex-col gap-3 pb-2">
                {activeTab === 'prescription' ? (
                    <>
                        {consultation.prescription?.formulas && consultation.prescription.formulas.length > 0 ? (
                            consultation.prescription.formulas.map((f, fIdx) => (
                                <div key={fIdx} className="bg-theme-surface p-3 rounded-lg border border-theme-border flex flex-col gap-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between text-sm font-bold text-theme-primary border-b border-theme-border pb-1">
                                        <span>{f.name || `處方 ${fIdx + 1}`} ({f.days} 天，每日 {f.dosesPerDay} 劑)</span>
                                        <span>共 {f.herbItems?.length || 0} 味藥</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {f.herbItems?.map((h, hIdx) => (
                                            <div key={hIdx} className="flex justify-between items-center text-sm border-b border-dashed border-theme-border/50 pb-0.5">
                                                <span className="font-semibold text-theme-text">{h.name}</span>
                                                <span className="text-theme-text-muted">{h.dosage} {h.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {consultation.prescription.advice && (
                                        <div className="text-xs text-theme-text-muted mt-1.5 pt-1.5 border-t border-theme-border/30">
                                            <span className="font-bold">醫囑：</span>{consultation.prescription.advice}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (<div className="text-center py-4 text-theme-text-muted text-sm">此次就診無處方紀錄</div>)}
                    </>
                ) : (
                    <>
                        {consultation.acupuncture && consultation.acupuncture.length > 0 ? (
                            <div className="bg-theme-surface p-3 rounded-lg border border-theme-border flex flex-col gap-2 shadow-2xs">
                                <div className="text-sm font-bold text-theme-primary border-b border-theme-border pb-1 mb-1">針灸處方明細</div>
                                <div className="grid grid-cols-1 gap-2">
                                    {consultation.acupuncture.map((a, aIdx) => (
                                        <div key={aIdx} className="flex items-center justify-between text-sm bg-theme-surface-alt/50 p-2 rounded border border-theme-border/50">
                                            <div className="flex items-center gap-2"><span className="font-bold text-theme-text">{a.meridian}-{a.acupoint}</span></div>
                                            <div className="flex items-center gap-3 text-theme-text-muted">
                                                <span><span className="text-xs mr-1">手法:</span>{a.method}</span>
                                                <span><span className="text-xs mr-1">位置:</span>{a.location}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (<div className="text-center py-4 text-theme-text-muted text-sm">此次就診無針灸紀錄</div>)}
                    </>
                )}
            </div>
        </div>
    );
}

function HistoryModal({ patient, history, onClose, onApply }: any) {
    const renderNoteField = (label: string, value: string | undefined, isBold = false) => {
        if (!value) return null;
        return <div><span className="font-bold text-theme-text-muted text-xs mr-2">{label}</span><span className={isBold ? "font-bold" : ""}>{value}</span></div>;
    };

    return (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in no-print">
            <div className="bg-theme-surface w-full h-full max-w-6xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-theme-border">
                <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/50">
                    <h2 className="text-lg font-bold text-theme-text flex items-center gap-2"><History size={20} className="text-theme-primary" /> 病患完整病歷總覽: {patient.name}</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-theme-border rounded-lg text-theme-text-muted transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-theme-surface custom-scrollbar">
                    {history && history.length > 0 ? (
                        <div className="flex flex-col gap-6">
                            {history.map((hist: any, idx: number) => (
                                <div key={hist.id || idx} className="rounded-xl border border-theme-border bg-theme-bg shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between bg-theme-surface-alt/50 px-4 py-3 border-b border-theme-border">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-theme-text text-base">
                                                {hist.createdAt ? new Date(hist.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未指定時間'}
                                            </span>
                                            <span className="text-xs font-bold bg-theme-surface px-2 py-1 rounded text-theme-text-muted border border-theme-border">{hist.doctorName || '醫師'}</span>
                                        </div>
                                        <button onClick={() => { onApply(hist, 'all'); onClose(); }} className="text-xs flex items-center gap-1.5 bg-theme-primary text-white px-3 py-1.5 rounded-lg hover:bg-theme-primary-light transition-all shadow-xs font-bold">
                                            <Plus size={14} /> 一鍵貼上全部
                                        </button>
                                    </div>

                                    <div className="p-4 grid lg:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between border-b border-theme-border/50 pb-1.5">
                                                <h3 className="text-sm font-bold text-theme-primary">中醫理法 (四診)</h3>
                                                <button onClick={() => { onApply(hist, 'notes'); onClose(); }} className="text-[11px] flex items-center gap-1 text-theme-primary bg-theme-primary/10 hover:bg-theme-primary hover:text-white px-2 py-1 rounded transition-colors font-bold">
                                                    <Plus size={12} /> 貼上病歷
                                                </button>
                                            </div>
                                            <div className="bg-theme-surface border border-theme-border/50 rounded-lg p-3 text-sm flex flex-col gap-2">
                                                {renderNoteField('主訴', hist?.clinicalNotes?.chiefComplaint)}
                                                {renderNoteField('現在症', hist?.clinicalNotes?.present_illness)}
                                                {renderNoteField('望診', hist?.clinicalNotes?.observation)}
                                                {renderNoteField('舌診', hist?.clinicalNotes?.tongue)}
                                                {renderNoteField('脈診', hist?.clinicalNotes?.pulse)}
                                                {renderNoteField('診斷', hist?.clinicalNotes?.diagnosis, true)}
                                                {renderNoteField('治法', hist?.clinicalNotes?.treatmentPrinciple || hist?.clinicalNotes?.treatmentPlan, true)}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            {hist.prescription?.formulas?.length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between border-b border-theme-border/50 pb-1.5">
                                                        <h3 className="text-sm font-bold text-theme-primary">處方用藥</h3>
                                                        <button onClick={() => { onApply(hist, 'prescription'); onClose(); }} className="text-[11px] flex items-center gap-1 text-theme-primary bg-theme-primary/10 hover:bg-theme-primary hover:text-white px-2 py-1 rounded transition-colors font-bold">
                                                            <Plus size={12} /> 貼上處方
                                                        </button>
                                                    </div>
                                                    <div className="bg-theme-surface border border-theme-border/50 rounded-lg p-3">
                                                        {hist.prescription.formulas.map((f: any, fIdx: number) => (
                                                            <div key={fIdx} className="mb-2 last:mb-0">
                                                                <div className="text-xs font-bold text-theme-text mb-1 border-b border-theme-border/30 pb-1">
                                                                    {f.name || `處方 ${fIdx + 1}`} ({f.days} 天，每日 {f.dosesPerDay} 劑)
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                                    {f.herbItems?.map((h: any, hIdx: number) => (
                                                                        <div key={hIdx} className="flex justify-between text-xs">
                                                                            <span className="font-semibold">{h.name}</span>
                                                                            <span className="text-theme-text-muted">{h.dosage} {h.unit}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {hist.prescription.advice && (
                                                            <div className="mt-2 pt-2 border-t border-theme-border/30 text-xs text-theme-text-muted">
                                                                <span className="font-bold">醫囑：</span>{hist.prescription.advice}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {hist.acupuncture?.length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between border-b border-theme-border/50 pb-1.5">
                                                        <h3 className="text-sm font-bold text-theme-primary">針灸用穴</h3>
                                                        <button onClick={() => { onApply(hist, 'acupuncture'); onClose(); }} className="text-[11px] flex items-center gap-1 text-theme-primary bg-theme-primary/10 hover:bg-theme-primary hover:text-white px-2 py-1 rounded transition-colors font-bold">
                                                            <Plus size={12} /> 貼上穴位
                                                        </button>
                                                    </div>
                                                    <div className="bg-theme-surface border border-theme-border/50 rounded-lg p-3">
                                                        <div className="grid grid-cols-1 gap-1.5">
                                                            {hist.acupuncture.map((a: any, aIdx: number) => (
                                                                <div key={aIdx} className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-theme-text">{a.meridian}-{a.acupoint}</span>
                                                                    <div className="flex gap-2 text-theme-text-muted">
                                                                        <span>手法:{a.method}</span><span>位置:{a.location}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {((hist.billingItems?.length > 0) || hist.otherTreatments) && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between border-b border-theme-border/50 pb-1.5">
                                                        <h3 className="text-sm font-bold text-theme-primary">其他/收費</h3>
                                                    </div>
                                                    <div className="bg-theme-surface border border-theme-border/50 rounded-lg p-3 text-xs">
                                                        {hist.otherTreatments && (
                                                            <div className="mb-2 text-theme-text-muted"><span className="font-bold mr-2">其他治療:</span>{hist.otherTreatments}</div>
                                                        )}
                                                        {hist.billingItems?.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-1 pt-1 border-t border-theme-border/30">
                                                                {hist.billingItems.filter((b: any) => b.active).map((b: any, bIdx: number) => (
                                                                    <span key={bIdx} className="bg-theme-bg px-2 py-0.5 rounded text-[10px] border border-theme-border">
                                                                        {b.name} x{b.qty}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-theme-text-muted gap-4">
                            <History size={48} className="opacity-20" /><p>此病患暫無歷史就診紀錄</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}