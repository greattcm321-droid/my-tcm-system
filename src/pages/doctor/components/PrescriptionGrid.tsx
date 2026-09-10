import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Eye, X, Printer, ClipboardCheck, ShieldAlert } from 'lucide-react';
import type { Patient } from '../../../types';

export interface HerbRow { id: string; name: string; form: string; dosage: string; unit: string; concentration: string; stock: string; instruction: string; safeLimit: string; }
export interface Formula { id: string; name: string; days: number; dosesPerDay: number; herbs: HerbRow[]; }

const FORMS = ['草藥', '濃縮藥粉', '農本方', '海天'];
const UNITS = ['克', '錢', '粒'];
const INSTRUCTIONS = ['先煎', '後下', '沖服', '烊化', '包煎', '常規'];

interface PrescriptionGridProps {
    formulas: Formula[];
    onChange: (formulas: Formula[]) => void;
    advice: string;
    onAdviceChange: (val: string) => void;
    contraindications: string;
    onContraindicationsChange: (val: string) => void;
    incomingHerb: string;
    onHerbAdded: () => void;
    onTotalDaysChange: (totalDays: number) => void;
    highlight?: boolean;
    patient?: Patient | null;
    diagnosis?: string;
    doctorName?: string;
    clinicName?: string;
}

const PrescriptionGrid: React.FC<PrescriptionGridProps> = ({
    formulas,
    onChange,
    advice,
    onAdviceChange,
    contraindications,
    onContraindicationsChange,
    incomingHerb,
    onHerbAdded,
    onTotalDaysChange,
    highlight,
    patient,
    diagnosis,
    doctorName = "註冊中醫師",
    clinicName = "智醫中醫診所",
}) => {
    const [activeFormulaId, setActiveFormulaId] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // Store callback in ref to avoid triggering re-renders
    const onTotalDaysChangeRef = useRef(onTotalDaysChange);
    onTotalDaysChangeRef.current = onTotalDaysChange;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onHerbAddedRef = useRef(onHerbAdded);
    onHerbAddedRef.current = onHerbAdded;

    const totalDays = useMemo(() => formulas.reduce((sum, f) => sum + f.days, 0), [formulas]);

    useEffect(() => {
        onTotalDaysChangeRef.current(totalDays);
    }, [totalDays]);

    useEffect(() => {
        if (formulas.length > 0 && !activeFormulaId) {
            setActiveFormulaId(formulas[0].id);
        }
    }, [formulas, activeFormulaId]);

    useEffect(() => {
        if (incomingHerb) {
            const newFormulas = formulas.map(f => {
                if (f.id === activeFormulaId) {
                    const lastHerb = f.herbs[f.herbs.length - 1];
                    let newHerbs = [...f.herbs];
                    if (lastHerb && lastHerb.name === '' && lastHerb.dosage === '') {
                        newHerbs[newHerbs.length - 1] = { ...lastHerb, name: incomingHerb };
                    } else {
                        newHerbs.push({ id: Date.now().toString(), name: incomingHerb, form: '農本方', dosage: '', unit: '克', concentration: '5:1', stock: '-', instruction: '常規', safeLimit: '無' });
                    }
                    return { ...f, herbs: newHerbs };
                }
                return f;
            });
            onChangeRef.current(newFormulas);
            onHerbAddedRef.current();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingHerb, activeFormulaId]);

    const activeFormula = formulas.find(f => f.id === activeFormulaId) || formulas[0];

    const addFormula = () => {
        const newId = Date.now().toString();
        onChange([...formulas, { id: newId, name: `處方 ${formulas.length + 1}`, days: 3, dosesPerDay: 2, herbs: [{ id: Date.now().toString(), name: '', form: '農本方', dosage: '', unit: '克', concentration: '5:1', stock: '-', instruction: '常規', safeLimit: '無' }] }]);
        setActiveFormulaId(newId);
    };

    const removeFormula = (e: React.MouseEvent, formulaId: string) => {
        e.stopPropagation();
        if (formulas.length === 1) return;
        const newFormulas = formulas.filter(f => f.id !== formulaId);
        onChange(newFormulas);
        if (activeFormulaId === formulaId) setActiveFormulaId(newFormulas[0].id);
    };

    const updateHerb = (herbId: string, field: keyof HerbRow, value: string) => {
        const newFormulas = formulas.map(f => f.id === activeFormulaId ? { ...f, herbs: f.herbs.map(h => h.id === herbId ? { ...h, [field]: value } : h) } : f);
        onChange(newFormulas);
    };

    const updateFormulaMeta = (field: 'days' | 'dosesPerDay', value: number) => {
        const newFormulas = formulas.map(f => f.id === activeFormulaId ? { ...f, [field]: value } : f);
        onChange(newFormulas);
    };

    const removeHerb = (herbId: string) => {
        const newFormulas = formulas.map(f => {
            if (f.id === activeFormulaId) {
                const newHerbs = f.herbs.filter(h => h.id !== herbId);
                if (newHerbs.length === 0) newHerbs.push({ id: Date.now().toString(), name: '', form: '農本方', dosage: '', unit: '克', concentration: '5:1', stock: '-', instruction: '常規', safeLimit: '無' });
                return { ...f, herbs: newHerbs };
            }
            return f;
        });
        onChange(newFormulas);
    };

    const addEmptyRow = () => {
        const newFormulas = formulas.map(f => f.id === activeFormulaId ? { ...f, herbs: [...f.herbs, { id: Date.now().toString(), name: '', form: '農本方', dosage: '', unit: '克', concentration: '5:1', stock: '-', instruction: '常規', safeLimit: '無' }] } : f);
        onChange(newFormulas);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: 'name' | 'dosage') => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const isLastRow = index === activeFormula.herbs.length - 1;
            if (isLastRow && e.key === 'Enter') {
                addEmptyRow();
                setTimeout(() => {
                    document.getElementById(`herb-${field}-${activeFormula.id}-${index + 1}`)?.focus();
                }, 50);
            } else if (!isLastRow) {
                document.getElementById(`herb-${field}-${activeFormula.id}-${index + 1}`)?.focus();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (index > 0) {
                document.getElementById(`herb-${field}-${activeFormula.id}-${index - 1}`)?.focus();
            }
        } else if (e.key === 'ArrowRight') {
            const target = e.target as HTMLInputElement;
            if (target.selectionStart === target.value.length) {
                e.preventDefault();
                if (field === 'name') {
                    document.getElementById(`herb-dosage-${activeFormula.id}-${index}`)?.focus();
                } else if (field === 'dosage' && index < activeFormula.herbs.length - 1) {
                    document.getElementById(`herb-name-${activeFormula.id}-${index + 1}`)?.focus();
                }
            }
        } else if (e.key === 'ArrowLeft') {
            const target = e.target as HTMLInputElement;
            if (target.selectionStart === 0) {
                e.preventDefault();
                if (field === 'dosage') {
                    document.getElementById(`herb-name-${activeFormula.id}-${index}`)?.focus();
                } else if (field === 'name' && index > 0) {
                    document.getElementById(`herb-dosage-${activeFormula.id}-${index - 1}`)?.focus();
                }
            }
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className={`flex flex-col h-full relative transition-all duration-500 rounded-sm ${highlight ? 'bg-theme-primary/5 ring-1 ring-theme-primary/20 scale-[0.995]' : ''}`}>
            {/* Header & Meta Consolidated */}
            <div className="flex items-center justify-between bg-theme-bg/50 p-2 border-b border-theme-border rounded-t-sm gap-4 shrink-0 flex-wrap md:flex-nowrap">
                {/* Left Side: Formula Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    {formulas.map(f => (
                        <div key={f.id} className="relative group flex items-center">
                            <button onClick={() => setActiveFormulaId(f.id)} className={`px-3 py-1 rounded text-xs font-bold transition-all pr-7 whitespace-nowrap ${activeFormulaId === f.id ? 'bg-theme-primary text-white shadow-sm ring-1 ring-theme-primary/20' : 'bg-theme-surface text-theme-text-muted border border-theme-border hover:text-theme-primary'}`}>
                                {f.name}
                            </button>
                            {formulas.length > 1 && (
                                <button onClick={(e) => removeFormula(e, f.id)} className={`absolute right-1 p-0.5 rounded-full transition-colors ${activeFormulaId === f.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-theme-text-muted hover:text-red-500 hover:bg-red-50'}`}>
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addFormula} className="px-2 py-1 rounded text-xs text-theme-text-muted border border-dashed border-theme-border hover:text-theme-primary hover:border-theme-primary flex items-center gap-1 transition-colors shrink-0">
                        <Plus size={12} /> 新增方劑
                    </button>
                </div>

                {/* Right Side: Meta Inputs & Actions */}
                <div className="flex items-center gap-4 ml-auto shrink-0">
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-theme-text-muted whitespace-nowrap">日數:</label>
                        <input type="number" min="1" value={activeFormula.days} onChange={(e) => updateFormulaMeta('days', parseInt(e.target.value) || 1)} className="w-12 px-1.5 py-0.5 bg-theme-bg border border-theme-border rounded text-xs text-theme-text font-bold text-center focus:border-theme-primary outline-none" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold text-theme-text-muted whitespace-nowrap">次/日:</label>
                        <input type="number" min="1" value={activeFormula.dosesPerDay} onChange={(e) => updateFormulaMeta('dosesPerDay', parseInt(e.target.value) || 1)} className="w-12 px-1.5 py-0.5 bg-theme-bg border border-theme-border rounded text-xs text-theme-text font-bold text-center focus:border-theme-primary outline-none" />
                    </div>
                    <div className="text-[11px] font-bold text-theme-primary bg-theme-primary/10 px-2 py-0.5 rounded border border-theme-primary/20 whitespace-nowrap">
                        共 {activeFormula.days * activeFormula.dosesPerDay} 包
                    </div>
                    <button onClick={() => setShowPreview(true)} className="px-2.5 py-1 bg-theme-primary text-white font-bold border border-theme-primary/20 rounded text-xs flex items-center gap-1 hover:bg-theme-primary/90 shadow-sm transition-all shrink-0">
                        <Eye size={12} /> 預覽處方
                    </button>
                </div>
            </div>

            {/* Grid Body (2-Column Layout with single line herb entry) */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-x-6 gap-y-3 custom-scrollbar bg-theme-surface items-start content-start">
                {activeFormula.herbs.map((herb, index) => (
                    <div key={herb.id} className="flex items-center justify-between hover:bg-theme-bg p-1.5 rounded border border-theme-border hover:border-theme-primary/50 shadow-xs bg-white gap-1.5" title={`倍數: ${herb.concentration} | 存量: ${herb.stock} | 警告: ${herb.safeLimit}`}>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                                id={`herb-name-${activeFormula.id}-${index}`}
                                type="text"
                                className="w-24 shrink-0 bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text font-bold focus:border-theme-primary outline-none"
                                value={herb.name}
                                onChange={(e) => updateHerb(herb.id, 'name', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                                autoComplete="off"
                                placeholder="藥名..."
                            />
                            <select tabIndex={-1} className="w-[70px] shrink-0 bg-theme-surface border border-theme-border rounded px-1 py-1 text-xs text-theme-text focus:border-theme-primary outline-none" value={herb.form} onChange={(e) => updateHerb(herb.id, 'form', e.target.value)}>
                                {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <input
                                id={`herb-dosage-${activeFormula.id}-${index}`}
                                type="number"
                                className="w-[50px] shrink-0 bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs text-theme-text focus:border-theme-primary text-right outline-none"
                                value={herb.dosage}
                                onChange={(e) => updateHerb(herb.id, 'dosage', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'dosage')}
                                placeholder="用量"
                            />
                            <select tabIndex={-1} className="w-[45px] shrink-0 bg-theme-surface border border-theme-border rounded px-1 py-1 text-xs text-theme-text focus:border-theme-primary outline-none" value={herb.unit} onChange={(e) => updateHerb(herb.id, 'unit', e.target.value)}>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <select tabIndex={-1} className="w-[65px] shrink-0 bg-theme-surface border border-theme-border rounded px-1 py-1 text-xs text-theme-text focus:border-theme-primary outline-none" value={herb.instruction} onChange={(e) => updateHerb(herb.id, 'instruction', e.target.value)}>
                                {INSTRUCTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                            {herb.safeLimit !== '無' && (
                                <span className="text-red-500 font-bold text-[10px] shrink-0" title={`警告: ${herb.safeLimit}`}>⚠️</span>
                            )}
                        </div>
                        <button tabIndex={-1} onClick={() => removeHerb(herb.id)} className="w-[20px] h-[20px] shrink-0 text-theme-text-muted hover:text-red-500 hover:bg-red-50 rounded-full flex justify-center items-center transition-colors">
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Advice area */}
            <div className="shrink-0 p-3 bg-theme-bg/30 border-t border-theme-border space-y-3">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-[11px] font-bold text-theme-primary flex items-center gap-1.5">
                            <ClipboardCheck size={12} /> 醫囑
                        </label>
                        <textarea value={advice} onChange={(e) => onAdviceChange(e.target.value)} className="w-full h-16 bg-theme-surface border border-theme-border rounded-sm p-2 text-xs text-theme-text outline-none resize-none" placeholder="醫囑..." />
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                            <ShieldAlert size={12} /> 禁忌
                        </label>
                        <textarea value={contraindications} onChange={(e) => onContraindicationsChange(e.target.value)} className="w-full h-16 bg-theme-surface border border-theme-border rounded-sm p-2 text-xs text-theme-text outline-none resize-none" placeholder="禁忌..." />
                    </div>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col animate-fade-in print:bg-transparent">
                    {/* Header bar */}
                    <div className="shrink-0 p-4 flex items-center justify-between border-b border-white/10 bg-theme-surface/5 print:hidden">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-theme-primary/20 rounded-sm text-theme-primary"><Printer size={28} /></div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">處方套印預覽</h3>
                                <p className="text-sm text-stone-400">請確認 A4 排版後，點選列印。系統將自動過濾背景介面。</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handlePrint} className="px-6 py-2 bg-theme-primary text-theme-surface font-bold rounded-sm shadow-sm hover:opacity-90 transition-all flex items-center gap-2">
                                <Printer size={20} /> 開始列印 (Print)
                            </button>
                            <button onClick={() => setShowPreview(false)} className="p-2 text-stone-400 hover:text-white transition-colors"><X size={40} /></button>
                        </div>
                    </div>

                    {/* Preview Area — 可捲動視圖，真實尺寸渲染再縮放 */}
                    <div className="flex-1 overflow-y-auto bg-gray-200/80 p-8 flex justify-center items-start">
                        {/* origin-top 確保縮放從頂部展開，不誤切斷 */}
                        <div className="origin-top scale-[0.55] md:scale-[0.65] print:transform-none print:scale-100" style={{ transformOrigin: 'top center' }}>
                            {/* ⚠️ 移除了 print:p-0，讓 p-[20mm] 在列印時保護邊界 */}
                            <div id="printable-prescription" className="bg-white text-black w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl flex flex-col font-serif print:w-full print:min-h-0 print:shadow-none">
                                <div className="text-center border-b-4 border-double border-black pb-6 mb-8">
                                    <h1 className="text-4xl font-black tracking-[0.2em] mb-2">{clinicName}</h1>
                                    <h2 className="text-2xl font-bold">中醫處方箋 (TCM Prescription)</h2>
                                </div>

                                <div className="grid grid-cols-4 gap-4 mb-6 text-sm font-sans border-b border-black/10 pb-4">
                                    <div className="flex gap-2"><span>姓名：</span><span className="font-bold underline underline-offset-4">{patient?.name}</span></div>
                                    <div className="flex gap-2"><span>性別：</span><span className="font-bold underline underline-offset-4">{patient?.gender === 'male' ? '男' : '女'}</span></div>
                                    <div className="flex gap-2"><span>日期：</span><span className="font-bold underline underline-offset-4">{new Date().toLocaleDateString('zh-HK')}</span></div>
                                    <div className="flex gap-2"><span>病歷：</span><span className="font-mono text-xs font-bold">{patient?.id?.slice(-8).toUpperCase()}</span></div>
                                </div>

                                <div className="mb-6 p-4 bg-gray-50 border-l-8 border-black font-sans">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">臨床診斷 (Diagnosis)</h3>
                                    <p className="text-xl font-bold text-black border-b-2 border-dashed border-gray-300 pb-2">{diagnosis || '一般診症'}</p>
                                </div>

                                {/* 藥材區塊：h-auto 讓內容自然往下撐 */}
                                <div className="space-y-10">
                                    {formulas.map(f => {
                                        const validHerbs = f.herbs.filter(h => h.name.trim() !== '');
                                        if (validHerbs.length === 0) return null;
                                        return (
                                            <div key={f.id} className="prescription-block relative">
                                                <div className="flex items-end justify-between border-b-2 border-black mb-4 pb-1">
                                                    <h4 className="text-xl font-black">【{f.name}】</h4>
                                                    <div className="text-sm font-bold flex gap-6 font-sans">
                                                        <span>劑量：共 {f.days} 劑</span>
                                                        <span>頻次：每日 {f.dosesPerDay} 份</span>
                                                    </div>
                                                </div>
                                                {/* grid h-auto 讓 8/12 味藥自然換行，絕不截斷 */}
                                                <div className="grid grid-cols-4 gap-y-6 gap-x-12 px-2 h-auto">
                                                    {validHerbs.map((h, i) => (
                                                        <div key={i} className="flex justify-between items-end border-b border-gray-200 pb-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-lg font-bold">{h.name}</span>
                                                                {h.instruction !== '常規' && <span className="text-[10px] text-gray-400 font-sans italic">{h.instruction}</span>}
                                                            </div>
                                                            <div className="font-mono text-xl font-black">{h.dosage}<span className="text-xs font-normal ml-0.5">{h.unit}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-12 pt-8 border-t-4 border-black border-double space-y-8">
                                    <div className="grid grid-cols-2 gap-12 font-sans px-4">
                                        <div>
                                            <h4 className="text-xs font-black underline mb-3">醫師醫囑 (Advice)</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{advice}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black underline mb-3 text-red-700">用藥禁忌 (Contraindications)</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-red-700 font-medium">{contraindications}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="text-[9px] text-gray-400 font-sans italic max-w-[50%]">
                                            * 本處方僅供參考，請依照註冊中醫師指導服用 *<br />
                                            Generated by SmartTCM Clinic Management System @ {new Date().toLocaleString()}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-md mb-6 font-sans">註冊中醫師：<span className="font-bold underline underline-offset-4 mx-2 text-lg">{doctorName}</span></p>
                                            <div className="border-b-2 border-black w-60 ml-auto"></div>
                                            <p className="text-[10px] mt-2 font-sans text-gray-400 uppercase tracking-widest">Digital Stamp & Signature</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrescriptionGrid;