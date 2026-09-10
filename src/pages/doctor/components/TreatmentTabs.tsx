import React, { useState, useCallback, useRef } from 'react';
import { Pill, Syringe, Activity, Image as ImageIcon, CreditCard, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import PrescriptionGrid, { Formula } from './PrescriptionGrid';
import type { Patient } from '../../../types';

export interface Acupoint { id: string; meridian: string; acupoint: string; method: string; location: string; }
export interface BillingItemRow { id: string; name: string; price: number; active: boolean; qty: number; editableQty: boolean; }

interface TreatmentTabsProps {
    formulas: Formula[];
    onFormulasChange: (formulas: Formula[]) => void;
    advice: string;
    onAdviceChange: (val: string) => void;
    contraindications: string;
    onContraindicationsChange: (val: string) => void;
    incomingHerb: string;
    onHerbAdded: () => void;

    // 💡 新增：接收外部傳入的狀態
    acupoints: Acupoint[];
    onAcupointsChange: (val: Acupoint[]) => void;
    otherTreatments: string;
    onOtherTreatmentsChange: (val: string) => void;
    billingItems: BillingItemRow[];
    onBillingItemsChange: (val: BillingItemRow[]) => void;

    highlightPrescription?: boolean;
    patient?: Patient | null;
    diagnosis?: string;
    doctorName?: string;
    clinicName?: string;
}

const METHODS = ['補', '瀉', '平', '放血', '艾灸'];
const LOCATIONS = ['左', '右', '雙'];

const TreatmentTabs: React.FC<TreatmentTabsProps> = ({
    formulas,
    onFormulasChange,
    advice,
    onAdviceChange,
    contraindications,
    onContraindicationsChange,
    incomingHerb,
    onHerbAdded,

    acupoints,
    onAcupointsChange,
    otherTreatments,
    onOtherTreatmentsChange,
    billingItems,
    onBillingItemsChange,

    highlightPrescription,
    patient,
    diagnosis,
    doctorName,
    clinicName
}) => {
    const [activeTab, setActiveTab] = useState<'prescription' | 'acupuncture' | 'other' | 'images' | 'billing'>('prescription');

    const updateAcupoint = (id: string, field: string, value: string) => onAcupointsChange(acupoints.map(a => a.id === id ? { ...a, [field]: value } : a));
    const removeAcupoint = (id: string) => {
        const newAcupoints = acupoints.filter(a => a.id !== id);
        onAcupointsChange(newAcupoints.length > 0 ? newAcupoints : [{ id: Date.now().toString(), meridian: '', acupoint: '', method: '平', location: '雙' }]);
    };

    const billingItemsRef = useRef(billingItems);
    billingItemsRef.current = billingItems;
    const onBillingItemsChangeRef = useRef(onBillingItemsChange);
    onBillingItemsChangeRef.current = onBillingItemsChange;

    const handleTotalDaysChange = useCallback((_totalDays: number) => {
        // 不再同步 qty 至手動選項。由護士端智能同步與計算藥費。
    }, []);

    const toggleBillingItem = (id: string) => onBillingItemsChange(billingItems.map(item => item.id === id ? { ...item, active: !item.active } : item));
    const updateBillingQty = (id: string, qty: number) => {
        if (qty < 1) return;
        onBillingItemsChange(billingItems.map(item => item.id === id ? { ...item, qty } : item));
    };

    const totalAmount = billingItems.reduce((sum, item) => item.active ? sum + (item.price * item.qty) : sum, 0);

    return (
        <div className="flex-1 flex flex-row bg-theme-surface border border-theme-border rounded-sm overflow-hidden shadow-sm min-h-[400px] transition-all duration-300">
            {/* Collapsible Left Mini-Sidebar */}
            <div className="group/sidebar flex flex-col bg-theme-bg/30 border-r border-theme-border w-12 hover:w-36 transition-all duration-250 overflow-hidden shrink-0 z-10">
                <div className="flex flex-col gap-1 p-1.5 flex-1">
                    {[
                        { id: 'prescription', label: '處方', icon: Pill },
                        { id: 'acupuncture', label: '針灸', icon: Syringe },
                        { id: 'other', label: '其他治療', icon: Activity },
                        { id: 'images', label: '圖片記錄', icon: ImageIcon },
                        { id: 'billing', label: '收費', icon: CreditCard },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-2 py-3 rounded text-sm font-bold transition-all w-full overflow-hidden whitespace-nowrap
                  ${activeTab === tab.id ? 'text-theme-primary bg-theme-primary/10' : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-bg'}`}
                            title={tab.label}
                        >
                            <tab.icon size={16} className="shrink-0" />
                            <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-250 select-none">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative bg-theme-surface">
                {activeTab === 'prescription' && (
                    <PrescriptionGrid
                        formulas={formulas}
                        onChange={onFormulasChange}
                        advice={advice}
                        onAdviceChange={onAdviceChange}
                        contraindications={contraindications}
                        onContraindicationsChange={onContraindicationsChange}
                        incomingHerb={incomingHerb}
                        onHerbAdded={onHerbAdded}
                        onTotalDaysChange={handleTotalDaysChange}
                        highlight={highlightPrescription}
                        patient={patient}
                        diagnosis={diagnosis}
                        doctorName={doctorName}
                        clinicName={clinicName}
                    />
                )}

                {activeTab === 'acupuncture' && (
                    <div className="flex flex-col h-full relative">
                        <div className="flex gap-2 px-4 py-2 bg-theme-bg text-xs font-bold text-theme-primary border-b border-theme-border">
                            <div className="flex-[2] min-w-[100px]">經絡 (Meridian)</div><div className="flex-[2] min-w-[100px]">穴位 (Acupoint)</div><div className="w-[80px]">方法</div><div className="w-[80px]">位置</div><div className="w-[35px]"></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {acupoints.map((a) => (
                                <div key={a.id} className="flex gap-2 items-center p-1 rounded-lg hover:bg-theme-bg">
                                    <input type="text" className="flex-[2] min-w-[100px] bg-theme-surface border border-theme-border rounded px-2 py-1 text-sm text-theme-text focus:border-theme-primary outline-none" placeholder="經絡..." value={a.meridian} onChange={(e) => updateAcupoint(a.id, 'meridian', e.target.value)} />
                                    <input type="text" className="flex-[2] min-w-[100px] bg-theme-surface border border-theme-border rounded px-2 py-1 text-sm text-theme-text focus:border-theme-primary outline-none" placeholder="穴位..." value={a.acupoint} onChange={(e) => updateAcupoint(a.id, 'acupoint', e.target.value)} />
                                    <select className="w-[80px] shrink-0 bg-theme-surface border border-theme-border rounded px-2 py-1 text-sm text-theme-text focus:border-theme-primary outline-none" value={a.method} onChange={(e) => updateAcupoint(a.id, 'method', e.target.value)}>
                                        {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <select className="w-[80px] shrink-0 bg-theme-surface border border-theme-border rounded px-2 py-1 text-sm text-theme-text focus:border-theme-primary outline-none" value={a.location} onChange={(e) => updateAcupoint(a.id, 'location', e.target.value)}>
                                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <button onClick={() => removeAcupoint(a.id)} className="w-[35px] shrink-0 text-theme-text-muted hover:text-red-600 hover:bg-red-50 p-1 rounded flex justify-center">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => onAcupointsChange([...acupoints, { id: Date.now().toString(), meridian: '', acupoint: '', method: '平', location: '雙' }])} className="mt-2 text-theme-primary hover:bg-theme-primary/10 text-xs flex items-center gap-1 px-3 py-1.5 rounded-sm border border-dashed border-theme-primary/40 w-full justify-center font-bold">
                                <Plus size={14} /> 新增穴位
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'other' && (
                    <div className="p-4 h-full flex flex-col">
                        <label className="text-xs font-bold text-theme-text-muted mb-2 block">臨床筆記與理療紀錄</label>
                        <textarea
                            value={otherTreatments}
                            onChange={(e) => onOtherTreatmentsChange(e.target.value)}
                            className="flex-1 text-sm p-4 resize-none bg-theme-bg border border-theme-border rounded-md text-theme-text focus:border-theme-primary outline-none"
                            placeholder="輸入細節..."
                        />
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="p-4 pb-20 h-full flex flex-col bg-theme-bg overflow-y-auto custom-scrollbar">
                        <div className="mb-4 pb-3 border-b border-theme-border flex justify-between items-end">
                            <div>
                                <h3 className="text-base font-bold text-theme-text flex items-center gap-2 mb-1">
                                    <CreditCard className="text-theme-primary" size={16} /> 醫囑收費項目勾選
                                </h3>
                                <p className="text-theme-text-muted text-xs">若有開立處方，護士端將自動同步天數與藥費。此處可勾選以確保計費。</p>
                            </div>
                            <div className="text-right">
                                <div className="text-theme-text-muted text-[10px] font-bold mb-0.5">預估總計</div>
                                <div className="text-2xl font-bold text-theme-primary leading-none">${totalAmount}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {billingItems.map(item => (
                                <div key={item.id} onClick={() => toggleBillingItem(item.id)} className={`flex items-center justify-between p-3 rounded-sm border transition-all cursor-pointer select-none ${item.active ? 'bg-theme-surface border-theme-primary shadow-sm' : 'bg-theme-surface border-theme-border hover:border-theme-text-muted/50'}`}>
                                    <div className="flex items-center gap-2.5">
                                        <div className={`rounded-full flex items-center justify-center transition-colors ${item.active ? 'text-theme-primary' : 'text-theme-text-muted/30'}`}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <div className={`text-sm font-bold ${item.active ? 'text-theme-primary' : 'text-theme-text'}`}>{item.name}</div>
                                            <div className="text-theme-text-muted text-[10px] font-medium">${item.price} / 次</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        {item.editableQty && item.active && (
                                            <div className="flex items-center gap-1.5 bg-theme-bg rounded p-1 border border-theme-border">
                                                <span className="text-theme-text-muted text-[10px] pl-1 font-bold">日數:</span>
                                                <input type="number" min="1" className="w-8 bg-transparent text-center text-theme-text font-bold text-xs focus:outline-none" value={item.qty} onChange={(e) => updateBillingQty(item.id, parseInt(e.target.value) || 1)} />
                                            </div>
                                        )}
                                        <div className={`font-mono font-bold text-base w-12 text-right ${item.active ? 'text-theme-text' : 'text-theme-text-muted'}`}>
                                            ${item.price * (item.active ? item.qty : 1)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'images' && <div className="p-4 h-full flex items-center justify-center text-theme-text-muted">圖片記錄區保留</div>}
            </div>
        </div>
    );
};

export default TreatmentTabs;