import React, { useState, useEffect, useMemo } from 'react';
import { Filter, ChevronRight, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// ─── 防呆 JSON 解析器（應對 Supabase TEXT vs JSONB column）────────────────────
function safeParse(data: any): any {
    if (!data) return null;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return null; }
    }
    return null;
}

// ─── 分類邏輯：優先讀 item.category（v2 結構），再 fallback 關鍵字比對（歷史資料）──
type ReportCat = 'consult' | 'herb' | 'acu' | 'massage' | 'bone' | 'trauma' | 'other';

const CATEGORY_MAP: Record<string, ReportCat> = {
    consultation: 'consult',
    herbs:        'herb',
    acupuncture:  'acu',
    tuina:        'massage',
    bone_setting: 'bone',
    traumatology: 'trauma',
    other:        'other',
};

function classifyItem(item: { name?: string; category?: string }): ReportCat {
    // 優先：標準 category enum（v2 格式）
    if (item.category && CATEGORY_MAP[item.category]) {
        return CATEGORY_MAP[item.category];
    }
    // Fallback：關鍵字模糊比對（兼容歷史資料）
    const n = (item.name || '').toLowerCase();
    if (n.includes('診金') || n.includes('諮詢') || n.includes('consultation'))     return 'consult';
    if (n.includes('藥費') || n.includes('中藥') || n.includes('濃縮顆粒') ||
        n.includes('草藥') || n.includes('藥')  || n.includes('herb'))              return 'herb';
    if (n.includes('針灸') || n.includes('針')  || n.includes('acupuncture'))        return 'acu';
    if (n.includes('推拿') || n.includes('按摩') || n.includes('tuina'))             return 'massage';
    if (n.includes('正骨') || n.includes('整脊') || n.includes('bone_setting'))      return 'bone';
    if (n.includes('跌打') || n.includes('敷藥') || n.includes('traumatology'))      return 'trauma';
    return 'other';
}

export default function Reports() {
    const { userProfile } = useAuth();
    const clinicId = userProfile?.clinicId || '';

    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
    const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
    
    const [doctors, setDoctors] = useState<{ id: string, name: string }[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!clinicId) return;

        const fetchDoctors = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name')
                .eq('clinic_id', clinicId)
                .eq('role', 'doctor');
                
            if (!error && data) {
                setDoctors(data.map((d: any) => ({ id: d.id, name: d.name || '未命名' })));
            }
        };

        fetchDoctors();
    }, [clinicId]);

    useEffect(() => {
        if (!clinicId) return;

        const fetchReportData = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from('appointments')
                    .select('*')
                    .eq('clinic_id', clinicId)
                    .eq('payment_status', 'paid');

                if (selectedDoctor !== 'all') {
                    query = query.eq('doctor_id', selectedDoctor);
                }

                // Date Filtering
                const now = new Date();
                let start: Date | null = null;
                
                if (dateRange === 'today') {
                    start = new Date(now.setHours(0, 0, 0, 0));
                } else if (dateRange === 'week') {
                    const firstDay = now.getDate() - now.getDay();
                    start = new Date(now.setDate(firstDay));
                    start.setHours(0, 0, 0, 0);
                } else if (dateRange === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                }

                if (start) {
                    query = query.gte('scheduled_at', start.toISOString());
                }

                const { data, error } = await query.order('scheduled_at', { ascending: false });
                
                if (!error && data) {
                    setAppointments(data);
                } else {
                    setAppointments([]);
                }
            } catch (err) {
                console.error("Error fetching report data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [clinicId, dateRange, selectedDoctor]);

    // Data Calculation & Grouping
    const { dailyReports, grandTotals } = useMemo(() => {
        const groups = new Map<string, any[]>();
        
        let grandVisits = 0;
        let grandConsult = 0;
        let grandHerb = 0;
        let grandAcu = 0;
        let grandMassage = 0;
        let grandBone = 0;
        let grandTuiNa = 0;
        let grandOther = 0;
        let grandRevenue = 0;

        appointments.forEach(app => {
            // Convert to YYYY/MM/DD localized string based on scheduled_at
            const dateObj = new Date(app.scheduled_at);
            const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

            if (!groups.has(dateStr)) {
                groups.set(dateStr, []);
            }
            groups.get(dateStr)!.push(app);
        });

        // Sort dates descending
        const sortedGroups = Array.from(groups.entries())
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
            .map(([date, apps]) => {
                let dayConsult = 0;
                let dayHerb = 0;
                let dayAcu = 0;
                let dayMassage = 0;
                let dayBone = 0;
                let dayTuiNa = 0;
                let dayOther = 0;
                let dayRevenue = 0;

                // Sort patients chronologically within the day
                const sortedApps = apps.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

                sortedApps.forEach(app => {
                    // safeParse: 應對 Supabase TEXT column（payment_details 可能是 JSON 字串）
                    const pd = safeParse(app.payment_details) || {};
                    const rawItems = pd.items;
                    const items: any[] = Array.isArray(rawItems) ? rawItems : [];
                    const pTotal = Number(pd.totalAmount) || 0;

                    // Debug log（確認資料結構，上線後可移除）
                    if (import.meta.env.DEV) {
                        console.log(`[Reports] ${app.patient_name} payment_details type=${typeof app.payment_details}, items count=${items.length}, total=${pTotal}`, pd);
                    }

                    let pConsult = 0, pHerb = 0, pAcu = 0, pMassage = 0, pBone = 0, pTuiNa = 0, pOther = 0;

                    if (items.length > 0) {
                        // New format: category 優先，subtotal 優先
                        items.forEach(item => {
                            const cat = classifyItem(item);  // 傳整個 item（含 category）
                            // 金額：優先用 subtotal（v2），再 fallback price*qty（v1/歷史）
                            const qty = Number(item.qty) > 0 ? Number(item.qty) : 1;
                            const amount = Number(item.subtotal) || (Number(item.price) || 0) * qty;
                            if (cat === 'consult')       pConsult += amount;
                            else if (cat === 'herb')     pHerb    += amount;
                            else if (cat === 'acu')      pAcu     += amount;
                            else if (cat === 'massage')  pMassage += amount;
                            else if (cat === 'bone')     pBone    += amount;
                            else if (cat === 'trauma')   pTuiNa   += amount;
                            else                         pOther   += amount;
                        });
                        pOther = Math.max(0, pOther);

                    } else if (pTotal > 0) {
                        // Legacy format: 無 items 細項，整筆放 other
                        pOther = pTotal;
                    }

                    dayConsult  += pConsult;
                    dayHerb     += pHerb;
                    dayAcu      += pAcu;
                    dayMassage  += pMassage;
                    dayBone     += pBone;
                    dayTuiNa    += pTuiNa;
                    dayOther    += pOther;
                    dayRevenue  += pTotal;

                    app.calculatedFees = {
                        pConsult, pHerb, pAcu, pMassage, pBone, pTuiNa, pOther, pTotal
                    };
                });

                grandVisits += apps.length;
                grandConsult += dayConsult;
                grandHerb += dayHerb;
                grandAcu += dayAcu;
                grandMassage += dayMassage;
                grandBone += dayBone;
                grandTuiNa += dayTuiNa;
                grandOther += dayOther;
                grandRevenue += dayRevenue;

                return {
                    date,
                    revenue: dayRevenue,
                    visits: apps.length,
                    fees: {
                        dayConsult, dayHerb, dayAcu, dayMassage, dayBone, dayTuiNa, dayOther
                    },
                    patients: sortedApps
                };
            });

        return { 
            dailyReports: sortedGroups, 
            grandTotals: {
                grandVisits, grandConsult, grandHerb, grandAcu, grandMassage, grandBone, grandTuiNa, grandOther, grandRevenue
            }
        };
    }, [appointments]);

    const toggleExpand = (date: string) => {
        const next = new Set(expandedDates);
        if (next.has(date)) {
            next.delete(date);
        } else {
            next.add(date);
        }
        setExpandedDates(next);
    };

    // If 'today' is selected, we might want to auto-expand it.
    useEffect(() => {
        if (dateRange === 'today' && dailyReports.length === 1) {
            setExpandedDates(new Set([dailyReports[0].date]));
        } else if (dateRange !== 'today') {
            setExpandedDates(new Set()); // Collapse all when switching to broader range
        }
    }, [dateRange, dailyReports]);

    return (
        <div className="flex flex-col h-full overflow-hidden animate-fade-in relative bg-theme-bg text-theme-text">
            {loading && (
                <div className="absolute inset-0 z-50 bg-theme-bg/50 backdrop-blur-sm flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            )}
            
            {/* Header & Controls */}
            <header className="p-6 border-b border-theme-border bg-theme-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black">營業報表 (Excel明細表)</h1>
                        <p className="text-xs font-bold text-theme-text-muted">自動分析各醫師每日營收與病患明細</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-theme-bg border border-theme-border rounded-lg p-1">
                        {[
                            { id: 'today', label: '今日' },
                            { id: 'week', label: '本週' },
                            { id: 'month', label: '本月' },
                            { id: 'all', label: '全部' }
                        ].map(range => (
                            <button
                                key={range.id}
                                onClick={() => setDateRange(range.id as any)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${dateRange === range.id ? 'bg-theme-surface shadow text-theme-primary' : 'text-theme-text-muted hover:text-theme-text'}`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
                        <select
                            value={selectedDoctor}
                            onChange={e => setSelectedDoctor(e.target.value)}
                            className="pl-8 pr-4 py-2 text-sm bg-theme-surface border border-theme-border rounded-lg focus:border-theme-primary outline-none font-bold appearance-none min-w-[140px] cursor-pointer"
                        >
                            <option value="all">全體主治醫師</option>
                            {doctors.map((d: { id: string; name: string }) => (
                                <option key={d.id} value={d.id}>{d.name} 醫師</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Main Content Area - Expandable Table */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-theme-bg">
                <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                            <thead className="bg-theme-bg/80 border-b border-theme-border text-theme-text-muted text-xs uppercase font-black tracking-widest sticky top-0 z-10 backdrop-blur-md shadow-sm">
                                <tr>
                                    <th className="px-4 py-4 w-10"></th>
                                    <th className="px-4 py-4">看診日期</th>
                                    <th className="px-4 py-4 text-right">看診人數</th>
                                    <th className="px-4 py-4 text-right">診金總數</th>
                                    <th className="px-4 py-4 text-right">藥費總數</th>
                                    <th className="px-4 py-4 text-right">針灸總數</th>
                                    <th className="px-4 py-4 text-right">推拿總數</th>
                                    <th className="px-4 py-4 text-right">正骨總數</th>
                                    <th className="px-4 py-4 text-right">跌打總數</th>
                                    <th className="px-4 py-4 text-right">其他費用</th>
                                    <th className="px-4 py-4 text-right text-emerald-600">單日總計 (HKD)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-border">
                                {dailyReports.length > 0 ? (
                                    dailyReports.map(day => (
                                        <React.Fragment key={day.date}>
                                            {/* Level 1: Date Row */}
                                            <tr 
                                                className="hover:bg-theme-bg/50 transition-colors cursor-pointer group"
                                                onClick={() => toggleExpand(day.date)}
                                            >
                                                <td className="px-4 py-4 text-center text-theme-primary transition-transform group-hover:scale-110">
                                                    {expandedDates.has(day.date) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </td>
                                                <td className="px-4 py-4 font-black text-theme-text text-base tracking-wide">{day.date}</td>
                                                <td className="px-4 py-4 text-right font-mono font-bold text-theme-text-muted">
                                                    {day.visits} <span className="text-xs font-normal">人</span>
                                                </td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayConsult.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayHerb.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayAcu.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayMassage.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayBone.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayTuiNa.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono text-stone-500">${day.fees.dayOther.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-mono font-black text-emerald-600 text-base">
                                                    ${day.revenue.toLocaleString()}
                                                </td>
                                            </tr>
                                            
                                            {/* Level 2: Patients Sub-table */}
                                            {expandedDates.has(day.date) && (
                                                <tr className="bg-theme-bg/30">
                                                    <td colSpan={11} className="p-0 border-t border-theme-border/50">
                                                        <div className="pl-[3.5rem] pr-4 py-4 border-l-4 border-theme-primary/40 m-2 mr-4 ml-4 bg-white rounded-md shadow-inner overflow-x-auto">
                                                            <table className="w-full text-xs text-left min-w-[1000px]">
                                                                <thead className="text-theme-text-muted border-b border-stone-200">
                                                                    <tr>
                                                                        <th className="pb-3 pr-4 font-bold">病患姓名</th>
                                                                        <th className="pb-3 px-3 text-right font-bold">診金</th>
                                                                        <th className="pb-3 px-3 text-right font-bold">藥費</th>
                                                                        <th className="pb-3 px-3 text-right font-bold">針灸</th>
                                                                        <th className="pb-3 px-3 text-right font-bold">推拿</th>
                                                                        <th className="pb-3 px-3 text-right font-bold">正骨</th>
                                                                        <th className="pb-3 px-3 text-right font-bold">跌打</th>
                                                                        <th className="pb-3 px-3 text-right font-bold text-stone-400">其他</th>
                                                                        <th className="pb-3 pl-4 text-right font-black text-theme-primary">病患總收費</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-stone-100">
                                                                    {day.patients.map((app, idx) => {
                                                                        const fees = app.calculatedFees;
                                                                        if (!fees) return null;

                                                                        return (
                                                                            <tr key={app.id || idx} className="hover:bg-stone-50 transition-colors">
                                                                                <td className="py-3 pr-4 font-bold text-theme-text">{app.patient_name || '未知病患'}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-600">${fees.pConsult.toLocaleString()}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-600">${fees.pHerb.toLocaleString()}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-600">${fees.pAcu.toLocaleString()}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-600">${fees.pMassage.toLocaleString()}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-600">${fees.pBone.toLocaleString()}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-600">${fees.pTuiNa.toLocaleString()}</td>
                                                                                <td className="py-3 px-3 text-right font-mono text-stone-400">${fees.pOther.toLocaleString()}</td>
                                                                                <td className="py-3 pl-4 text-right font-mono font-black text-emerald-600 bg-emerald-50/30 rounded-r-sm">
                                                                                    ${fees.pTotal.toLocaleString()}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-16 text-center text-theme-text-muted border-b-0">
                                            <div className="flex flex-col items-center justify-center opacity-60">
                                                <FileSpreadsheet size={32} className="mb-3" />
                                                <p className="text-sm font-bold">該區間尚無營業資料</p>
                                                <p className="text-xs mt-1">請嘗試選擇其他日期範圍或主治醫師</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {/* Level 3: Footer Row (Grand Total) */}
                            {dailyReports.length > 0 && (
                                <tfoot className="bg-stone-800 text-white font-black border-t-4 border-emerald-500 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-5 text-right tracking-widest text-sm text-stone-300">
                                            結算總計 (GRAND TOTAL)
                                        </td>
                                        <td className="px-4 py-5 text-right font-mono text-base text-emerald-300">
                                            {grandTotals.grandVisits} <span className="text-xs font-bold text-stone-400">人</span>
                                        </td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandConsult.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandHerb.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandAcu.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandMassage.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandBone.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandTuiNa.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-sm text-emerald-100">${grandTotals.grandOther.toLocaleString()}</td>
                                        <td className="px-4 py-5 text-right font-mono text-2xl text-emerald-400 flex items-baseline justify-end gap-1">
                                            <span className="text-sm font-bold text-stone-400 mr-1">HKD</span>
                                            ${grandTotals.grandRevenue.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
