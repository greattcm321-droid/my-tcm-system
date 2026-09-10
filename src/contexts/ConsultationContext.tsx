import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../services/appointmentService';
import { consultationService } from '../services/consultationService';
import { patientService } from '../services/patientService';
import type { Appointment, Patient, Consultation } from '../types';
import type { Formula } from '../pages/doctor/components/PrescriptionGrid';
import type { Acupoint, BillingItemRow } from '../pages/doctor/components/TreatmentTabs';

// ─── Default Values ─────────────────────────────────────────────────────────
export const DEFAULT_BILLING_ITEMS: BillingItemRow[] = [
    { id: '1', name: '診金',        price: 80,  active: true,  qty: 1, editableQty: false },
    { id: '2', name: '中藥',        price: 80,  active: true,  qty: 1, editableQty: false },
    { id: '3', name: '針灸',        price: 270, active: false, qty: 1, editableQty: false },
    { id: '4', name: '推拿',        price: 360, active: false, qty: 1, editableQty: false },
    { id: '5', name: '跌打',        price: 400, active: false, qty: 1, editableQty: false },
    { id: '6', name: '整脊',        price: 580, active: false, qty: 1, editableQty: false },
];

const DEFAULT_NOTES = {
    chiefComplaint: '', tongue: '', pulse: '', present_illness: '',
    observation: '', diagnosis: '', pathogenesis: '', treatmentPrinciple: '',
};

const DEFAULT_FORMULA: Formula = {
    id: '1', name: '處方 1', days: 3, dosesPerDay: 2,
    herbs: [{
        id: 'init', name: '', form: '農本方', dosage: '', unit: '克',
        concentration: '5:1', stock: '-', instruction: '常規', safeLimit: '無',
    }],
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ConsultationSession {
    appointmentId: string;
    appointment: Appointment;
    patient: Patient;
    history: Consultation[];
    notes: typeof DEFAULT_NOTES;
    formulas: Formula[];
    advice: string;
    contraindications: string;
    acupoints: Acupoint[];
    otherTreatments: string;
    billingItems: BillingItemRow[];
    isModified: boolean;
}

interface ConsultationContextValue {
    sessions: Record<string, ConsultationSession>;
    activeTabId: string;
    loadingSessionId: string | null;
    setActiveTabId: (id: string) => void;
    loadSession: (appointmentId: string, clinicId: string) => Promise<void>;
    updateSession: (id: string, update: Partial<ConsultationSession> | ((prev: ConsultationSession) => ConsultationSession)) => void;
    closeTab: (id: string, force?: boolean) => void;
    markSaved: (id: string) => void;
}

// ─── Helper: 合併草稿至預設 Session ─────────────────────────────────────────
function mergeDraftIntoSession(
    base: ConsultationSession,
    draft: Consultation,
): ConsultationSession {
    const merged = { ...base };

    // Notes
    if (draft.clinicalNotes) {
        merged.notes = { ...DEFAULT_NOTES, ...draft.clinicalNotes };
    }

    // Prescription
    if (draft.prescription?.formulas?.length) {
        merged.formulas = draft.prescription.formulas.map((f: any, idx: number) => ({
            id: `draft_${idx}`,
            name: `處方 ${idx + 1}`,
            days: f.days ?? 3,
            dosesPerDay: f.dosesPerDay ?? 2,
            herbs: f.herbItems.map((h: any, hIdx: number) => ({
                id:            `d_${idx}_${hIdx}`,
                name:          h.name ?? '',
                dosage:        h.dosage != null ? String(h.dosage) : '',
                unit:          h.unit ?? '克',
                form:          '農本方',
                concentration: '5:1',
                stock:         '-',
                instruction:   h.instruction ?? '常規',
                safeLimit:     '無',
            })),
        }));
        merged.advice            = draft.prescription.advice           ?? base.advice;
        merged.contraindications = draft.prescription.contraindications ?? base.contraindications;
    }

    // Acupuncture
    if (draft.acupuncture?.length) {
        merged.acupoints = draft.acupuncture.map((a: any, i: number) => ({ id: `d_acu_${i}`, ...a }));
    }

    // Other treatments
    if (draft.otherTreatments) merged.otherTreatments = draft.otherTreatments;

    // Billing — align against DEFAULT_BILLING_ITEMS so active flags are trustworthy
    if (draft.billing?.length) {
        const savedMap = new Map(draft.billing.map((b) => [b.name, b]));
        merged.billingItems = DEFAULT_BILLING_ITEMS.map((item) => {
            const saved = savedMap.get(item.name);
            return saved ? { ...item, active: true, qty: saved.qty } : { ...item, active: false };
        });
    }

    return merged;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const ConsultationContext = createContext<ConsultationContextValue | null>(null);

export function useConsultation() {
    const ctx = useContext(ConsultationContext);
    if (!ctx) throw new Error('useConsultation must be used inside ConsultationProvider');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ConsultationProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Record<string, ConsultationSession>>({});
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

    // Ref 鏡像，用於在 useCallback 內讀取最新 sessions 而不引入依賴
    const sessionsRef = useRef(sessions);
    sessionsRef.current = sessions;

    // 加載或切換 Session
    const loadSession = useCallback(async (appointmentId: string, clinicId: string) => {
        // 利用 ref 判斷，避免將 sessions 納入 dependency array
        if (sessionsRef.current[appointmentId]) {
            setActiveTabId(appointmentId);
            return;
        }

        setLoadingSessionId(appointmentId);
        try {
            const appt = await appointmentService.getById(appointmentId);
            if (!appt) {
                alert('查無此預約資訊。');
                navigate('/doctor');
                return;
            }

            const [patient, history, draft] = await Promise.all([
                patientService.getById(appt.patientId),
                consultationService.getPatientHistory(clinicId, appt.patientId),
                consultationService.getByAppointment(appointmentId),
            ]);

            // 建立預設 Session
            const base: ConsultationSession = {
                appointmentId,
                appointment:      appt,
                patient:          patient!,
                history:          history,
                notes:            { ...DEFAULT_NOTES },
                formulas:         [{ ...DEFAULT_FORMULA }],
                advice:           '中藥需與其他藥物或補充品相隔最少 2 小時服用。',
                contraindications:'服藥期間忌煎炸油膩、辛辣生冷之品。若有不適請立即停藥並諮詢醫師。',
                acupoints:        [{ id: String(Date.now()), meridian: '', acupoint: '', method: '平', location: '雙' }],
                otherTreatments:  '',
                billingItems:     [...DEFAULT_BILLING_ITEMS],
                isModified:       false,
            };

            // 若有草稿，合併進去
            const newSession = draft ? mergeDraftIntoSession(base, draft) : base;

            setSessions((prev) => ({ ...prev, [appointmentId]: newSession }));
            setActiveTabId(appointmentId);
        } catch (err) {
            console.error('Session 加載失敗:', err);
            alert('加載病患資料時發生錯誤。');
        } finally {
            setLoadingSessionId(null);
        }
    }, [navigate]); // sessions 已透過 sessionsRef 讀取，不再是依賴項

    // 純函數更新 Session，完全不依賴外部閉包狀態
    const updateSession = useCallback(
        (
            id: string,
            update: Partial<ConsultationSession> | ((prev: ConsultationSession) => ConsultationSession),
        ) => {
            setSessions((prev) => {
                const current = prev[id];
                if (!current) return prev;
                const next = typeof update === 'function' ? update(current) : { ...current, ...update };
                return { ...prev, [id]: { ...next, isModified: true } };
            });
        },
        [], // 純閉包，永遠穩定
    );

    // 清除 dirty flag
    const markSaved = useCallback((id: string) => {
        setSessions((prev) => {
            if (!prev[id]) return prev;
            return { ...prev, [id]: { ...prev[id], isModified: false } };
        });
    }, []);

    // 關閉頁籤，包含導航副作用
    const closeTab = useCallback((id: string) => {
        setSessions((prev) => {
            const next = { ...prev };
            delete next[id];
            const remaining = Object.keys(next);

            if (remaining.length === 0) {
                setActiveTabId('');
                navigate('/doctor');
            } else {
                setActiveTabId((cur) => {
                    const newActive = cur === id ? remaining[0] : cur;
                    if (cur === id) navigate(`/doctor/consultation/${newActive}`);
                    return newActive;
                });
            }

            return next;
        });
    }, [navigate]);

    return (
        <ConsultationContext.Provider value={{
            sessions, activeTabId, loadingSessionId,
            setActiveTabId, loadSession, updateSession, closeTab, markSaved,
        }}>
            {children}
        </ConsultationContext.Provider>
    );
}
