import { useState, useEffect } from 'react';
import { Search, Receipt, CreditCard, DollarSign, Printer, CheckCircle2, X, Clock, Plus, Loader2, Upload, BadgeCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../hooks/useRealtime';
import { appointmentService } from '../../services/appointmentService';
import { consultationService } from '../../services/consultationService';
import { patientService } from '../../services/patientService';
import { storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { clinicServiceService } from '../../services/clinicServiceService';
import type { ClinicService } from '../../types';

import type { Appointment, Patient, PaymentDetails, ServiceCategory, BillingLineItem } from '../../types';

// ─── 名稱 → 標準 Category 映射（開單時寫入、報表時讀取）───────────────────────────
function getCategory(name: string): ServiceCategory {
    const n = name.toLowerCase();
    if (n.includes('診金') || n.includes('諮詢') || n.includes('consultation')) return 'consultation';
    if (n.includes('藥費') || n.includes('中藥') || n.includes('濃縮顆粒') ||
        n.includes('草藥') || n.includes('藥')   || n.includes('herb'))          return 'herbs';
    if (n.includes('針灸') || n.includes('針')   || n.includes('acupuncture'))     return 'acupuncture';
    if (n.includes('推拿') || n.includes('按摩') || n.includes('tuina'))           return 'tuina';
    if (n.includes('正骨') || n.includes('整脊') || n.includes('bone_setting'))    return 'bone_setting';
    if (n.includes('跌打') || n.includes('敷藥') || n.includes('traumatology'))   return 'traumatology';
    return 'other';
}

const CATEGORY_LABELS_SHORT: Record<ServiceCategory, string> = {
    consultation: '診金',
    herbs:        '藥費',
    acupuncture:  '針灸',
    tuina:        '推拿',
    bone_setting: '正骨',
    traumatology: '跌打',
    other:        '其他',
};

export default function NurseBilling() {
    const { userProfile } = useAuth();
    const clinicId = userProfile?.clinicId || '';

    const { data: allAppointments, loading } = useRealtime<Appointment>('appointments', clinicId);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [, setSelectedConsultation] = useState<any>(null);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [fetchingData, setFetchingData] = useState(false);

    const [editableBilling, setEditableBilling] = useState<BillingLineItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentDetails['method']>('cash');

    // Voucher States
    const [voucherClaimAmount, setVoucherClaimAmount] = useState<number>(0);
    const [voucherTransactionNo, setVoucherTransactionNo] = useState('');
    const [voucherFile, setVoucherFile] = useState<File | null>(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    
    // 標準收費項目定價清單
    const [standardServices, setStandardServices] = useState<ClinicService[]>([]);

    useEffect(() => {
        if (!clinicId) return;
        clinicServiceService.getActive(clinicId)
            .then(data => setStandardServices(data))
            .catch(err => console.error("載入標準收費項目失敗:", err));
    }, [clinicId]);

    const [receiptData, setReceiptData] = useState<{
        patientName: string;
        items: { name: string, price: number, qty: number }[];
        total: number;
        method: string;
        voucherAmount?: number;
        date: string;
    } | null>(null);

    const today = new Date();

    const queue = allAppointments.filter(a => {
        const d = new Date(a.scheduledAt);
        return (
            d.toDateString() === today.toDateString() &&
            a.status === 'completed' &&
            a.paymentStatus !== 'paid' &&
            (searchQuery ? a.patientName?.includes(searchQuery) : true)
        );
    }).sort((a, b) => {
        const timeA = new Date(a.scheduledAt as string).getTime();
        const timeB = new Date(b.scheduledAt as string).getTime();
        return timeA - timeB;
    });

    const selectedAppointment = queue.find(a => a.id === selectedId);

    // 強健的 JSON 解析器
    const safeParse = (data: any) => {
        if (!data) return null;
        if (typeof data === 'object') return data;
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.warn("解析 JSON 字串失敗:", data);
                return null;
            }
        }
        return null;
    };

    useEffect(() => {
        if (!selectedAppointment?.id) {
            setSelectedConsultation(null);
            setSelectedPatient(null);
            setEditableBilling([]);
            return;
        }

        const fetchData = async () => {
            setFetchingData(true);
            try {
                const [rawCon, pat] = await Promise.all([
                    consultationService.getByAppointment(selectedAppointment.id!),
                    patientService.getById(selectedAppointment.patientId)
                ]);

                // 確保所有巢狀結構都被正確解析
                const con = {
                    ...rawCon,
                    prescription: safeParse(rawCon?.prescription),
                    acupuncture: safeParse(rawCon?.acupuncture),
                    billing: safeParse(rawCon?.billing)
                };

                console.log("🛡️ [Debug] 解析後的看診資料:", con);

                setSelectedConsultation(con);
                setSelectedPatient(pat);

                // 智能合併與去重演算法 (Smart Deduplication & Merge)
                
                const existingBilling = Array.isArray(con?.billing) ? con.billing : [];
                // ─── 組裝標準化 billing items ───────────────────────────────────────────
                const mkItem = (
                    name: string,
                    price: number,
                    qty: number,
                    unit = '次'
                ): BillingLineItem => ({
                    name,
                    category: getCategory(name),
                    price,
                    qty,
                    subtotal: price * qty,
                    unit,
                });

                const generatedBilling: BillingLineItem[] = [];

                // 1. 固定加入診金
                generatedBilling.push(mkItem('診金', 300, 1, '次'));

                // 2. 解析醫生手動添加的項目
                let manualAcupuncturePrice = 0;
                let hasManualAcupuncture = false;
                let manualHerbPrice = 0;
                let hasManualHerb = false;

                existingBilling.forEach((item: any) => {
                    const itemName = item?.name || '';
                    if (itemName.includes('針')) {
                        hasManualAcupuncture = true;
                        manualAcupuncturePrice = Number(item.price) || 270;
                    } else if (itemName.includes('藥')) {
                        hasManualHerb = true;
                        manualHerbPrice = Number(item.price) || 80;
                    } else if (!['診金'].includes(itemName)) {
                        generatedBilling.push(mkItem(itemName, Number(item.price) || 0, Number(item.qty) || 1));
                    }
                });

                // 3. 針灸去重合併
                const acupunctureItems = con?.acupuncture;
                const hasAcupointData = Array.isArray(acupunctureItems) && acupunctureItems.length > 0;

                if (hasAcupointData || hasManualAcupuncture) {
                    const acu = mkItem(
                        '針灸治療',
                        hasManualAcupuncture ? manualAcupuncturePrice : 270,
                        1,
                        '次'
                    );
                    generatedBilling.push(acu);
                }

                // 4. 中藥：qty = 開藥天數，subtotal = price * totalDays
                let totalDays = Number(con?.prescription?.totalDays) || 0;
                const formulas = con?.prescription?.formulas;
                if (totalDays === 0 && Array.isArray(formulas)) {
                    totalDays = formulas.reduce((acc: number, f: any) => acc + (Number(f?.days) || 0), 0);
                }

                const hasPrescriptionData = totalDays > 0 || (Array.isArray(formulas) && formulas.length > 0);

                if (hasPrescriptionData || hasManualHerb) {
                    const finalQty = totalDays > 0 ? totalDays : 1;
                    const herbPrice = hasManualHerb ? manualHerbPrice : 80;
                    generatedBilling.push(mkItem('藥費', herbPrice, finalQty, '天'));
                }


                setEditableBilling(generatedBilling);

                setVoucherClaimAmount(0);
                setVoucherTransactionNo('');
                setVoucherFile(null);
                setPaymentMethod(pat?.voucherEligible ? 'voucher' : 'cash');
            } catch (err) {
                console.error("Failed to fetch billing data:", err);
                setEditableBilling([]);
            } finally {
                setFetchingData(false);
            }
        };
        fetchData();
    }, [selectedAppointment?.id]);

    const safeBillingItems: BillingLineItem[] = editableBilling || [];
    const totalAmount = safeBillingItems.reduce((sum, item) => sum + (item.subtotal ?? (Number(item.price) * Number(item.qty))), 0);

    const updateBillingItem = (index: number, field: keyof BillingLineItem, value: string | number) => {
        const newArr = editableBilling.map((item, i) => {
            if (i !== index) return item;
            
            // 當修改項目名稱時，如果匹配到標準服務定價項目，自動帶入單價、單位及分類
            if (field === 'name') {
                const matched = standardServices.find(s => s.name === String(value));
                if (matched) {
                    const price = matched.defaultPrice;
                    const qty = matched.category === 'herbs' ? (item.qty > 1 ? item.qty : 1) : 1;
                    return {
                        ...item,
                        name: matched.name,
                        category: matched.category,
                        price,
                        qty,
                        unit: matched.unit,
                        subtotal: price * qty
                    };
                }
                return {
                    ...item,
                    name: String(value),
                    category: getCategory(String(value)),
                    subtotal: (Number(item.price) || 0) * (Number(item.qty) || 1)
                };
            }

            const updated = { ...item, [field]: value };
            updated.subtotal = (Number(updated.price) || 0) * (Number(updated.qty) || 1);
            return updated;
        });
        setEditableBilling(newArr);
    };

    const addBillingItem = () => {
        // 預設以第一個標準服務項目或 '新增項目' 作為範本
        const defaultSvc = standardServices[0];
        const newItem: BillingLineItem = defaultSvc 
            ? { 
                name: defaultSvc.name, 
                category: defaultSvc.category, 
                price: defaultSvc.defaultPrice, 
                qty: 1, 
                subtotal: defaultSvc.defaultPrice, 
                unit: defaultSvc.unit 
              }
            : { name: '新增項目', category: 'other', price: 0, qty: 1, subtotal: 0, unit: '次' };
            
        setEditableBilling([...safeBillingItems, newItem]);
    };

    const removeBillingItem = (index: number) => {
        setEditableBilling(safeBillingItems.filter((_, i) => i !== index));
    };

    const handleActionPayment = async () => {
        if (!selectedAppointment?.id || !clinicId) return;

        if (paymentMethod === 'voucher' || paymentMethod === 'mixed' || voucherClaimAmount > 0) {
            if (!voucherTransactionNo) {
                alert('請輸入醫療券交易編號');
                return;
            }
            if (!voucherFile) {
                alert('請上傳醫療券紙本同意書/收據相片');
                return;
            }
        }

        setSubmittingPayment(true);
        try {
            let voucherDocumentUrl = '';

            if (voucherFile) {
                const storageRef = ref(storage, `vouchers/${selectedAppointment.id}/${voucherFile.name}`);
                const snapshot = await uploadBytes(storageRef, voucherFile);
                voucherDocumentUrl = await getDownloadURL(snapshot.ref);
            }

            const paymentInfo: PaymentDetails = JSON.parse(JSON.stringify({
                method: paymentMethod,
                totalAmount: totalAmount,
                cashAmount: paymentMethod === 'mixed'
                    ? totalAmount - voucherClaimAmount
                    : (paymentMethod === 'cash' ? totalAmount : 0),
                paidAt: new Date().toISOString(),
                // v2: 完整 BillingLineItem 結構，包含 category + subtotal
                items: safeBillingItems.map(item => ({
                    name:     item.name,
                    category: item.category ?? getCategory(item.name),
                    price:    Number(item.price),
                    qty:      Number(item.qty),
                    subtotal: item.subtotal ?? (Number(item.price) * Number(item.qty)),
                    unit:     item.unit ?? '次',
                })),
            }));

            if (voucherClaimAmount > 0) {
                paymentInfo.voucherClaimAmount = voucherClaimAmount;
            }
            if (voucherTransactionNo) {
                paymentInfo.voucherTransactionNo = voucherTransactionNo;
            }
            if (voucherDocumentUrl) {
                paymentInfo.voucherDocumentUrl = voucherDocumentUrl;
            }

            const cleanUpdateData = {
                paymentStatus: 'paid' as const,
                paymentDetails: paymentInfo
            };

            console.log("準備更新的資料:", cleanUpdateData);
            await appointmentService.update(selectedAppointment.id, cleanUpdateData);

            if (selectedPatient?.id && voucherClaimAmount > 0) {
                const newBalance = (selectedPatient.voucherBalance || 0) - voucherClaimAmount;
                await patientService.update(selectedPatient.id, { voucherBalance: newBalance });
            }

            const methodMap: Record<string, string> = { cash: '現金', octopus: '八達通', voucher: '醫療券', credit: '信用卡', mixed: '混合支付' };
            setReceiptData({
                patientName: selectedAppointment.patientName || '病患',
                items: safeBillingItems,
                total: totalAmount,
                method: methodMap[paymentMethod] || '現金',
                voucherAmount: voucherClaimAmount > 0 ? voucherClaimAmount : undefined,
                date: new Date().toLocaleString('zh-HK')
            });
            setSelectedId(null);
        } catch (err: any) {
            console.error("Payment submission failed:", err);
            // 顯示更詳細的錯誤訊息
            alert(`結帳失敗！錯誤訊息：${err.message || '未知錯誤'}。請確認資料庫欄位名稱是否為 paymentDetails 或 payment_details。`);
        } finally {
            setSubmittingPayment(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4 animate-fade-in pb-2 relative">
            {/* Task Queue */}
            <div className="w-[30%] flex flex-col gap-4 overflow-hidden">
                <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex-1 flex flex-col shadow-sm">
                    <h3 className="text-theme-primary font-bold flex items-center gap-2 mb-4 border-b border-theme-border pb-3">
                        <Clock size={16} /> 執藥與收費隊列
                    </h3>
                    <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-2.5 text-theme-text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-theme-bg border border-theme-border rounded-sm focus:border-theme-primary outline-none text-theme-text font-medium"
                            placeholder="搜尋病患姓名..."
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                        {loading ? (
                            <div className="text-center py-10 flex flex-col items-center opacity-50"><Loader2 className="animate-spin mb-2" />載入中...</div>
                        ) : queue.length === 0 ? (
                            <div className="text-center py-10 text-theme-text-muted text-sm font-bold">目前無待處理項目</div>
                        ) : (
                            queue.map(task => {
                                const isSelected = selectedId === task.id;
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedId(task.id as string)}
                                        className={`p-3 rounded-sm border-2 cursor-pointer transition-all ${isSelected ? 'bg-theme-primary/10 border-theme-primary shadow-sm' : 'bg-theme-bg border-transparent hover:border-theme-border'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-bold ${isSelected ? 'text-theme-text' : 'text-theme-text-muted'}`}>{task.patientName}</span>
                                            {task.dispenseStatus === 'ready' ? (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-stone-200 text-stone-600 border border-stone-300">🟠 待收費</span>
                                            ) : (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-theme-primary/20 text-theme-primary border border-theme-primary/30">🟡 配藥中</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-theme-text-muted">診症結束於 {new Date(task.scheduledAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Action Panel */}
            <div className="flex-1 overflow-hidden">
                {!selectedAppointment ? (
                    <div className="h-full bg-theme-surface border border-theme-border rounded-xl shadow-sm flex flex-col items-center justify-center p-10 text-center">
                        <Receipt size={48} className="text-theme-text-muted opacity-20 mb-4" />
                        <h2 className="text-xl font-bold text-theme-text">請選擇隊列中的病患</h2>
                    </div>
                ) : fetchingData ? (
                    <div className="h-full bg-theme-surface border border-theme-border rounded-xl shadow-sm flex flex-col items-center justify-center p-10 text-center">
                        <Loader2 size={48} className="text-theme-primary animate-spin" />
                    </div>
                ) : (
                    <div className="h-full bg-theme-surface border-2 border-stone-200 rounded-sm shadow-sm flex flex-col overflow-hidden animate-fade-in-up">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-theme-border bg-stone-50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-theme-text font-black text-lg flex items-center gap-2 mb-0.5">
                                    <DollarSign size={20} className="text-stone-600" /> 收銀核銷系統
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-600">{selectedAppointment.patientName}</span>
                                    {selectedPatient?.voucherEligible && (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                                            <BadgeCheck size={10} /> 醫療券餘額: ${selectedPatient.voucherBalance}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-white border border-stone-200 rounded-sm text-right">
                                <div className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">TOTAL AMOUNT</div>
                                <div className="text-3xl font-black font-mono text-stone-600 tracking-tighter leading-none">${totalAmount.toFixed(1)}</div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-theme-bg/30 custom-scrollbar space-y-8">
                            {/* Billing List */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Receipt size={12} /> 費用清單
                                    </h3>
                                    <button
                                        onClick={addBillingItem}
                                        className="text-[10px] font-bold flex items-center gap-1 text-theme-primary hover:text-theme-primary/80 transition-colors bg-theme-primary/10 px-2 py-1 rounded-sm border border-theme-primary/20"
                                    >
                                        <Plus size={12} /> 新增項目
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {/* Datalist 供項目名稱選擇 */}
                                    <datalist id="standard-services-list">
                                        {standardServices.map(s => (
                                            <option key={s.id} value={s.name}>
                                                {CATEGORY_LABELS_SHORT[s.category] || '其他'} - ${s.defaultPrice}/{s.unit}
                                            </option>
                                        ))}
                                    </datalist>

                                    {safeBillingItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-white border border-theme-border rounded-sm shadow-sm group">
                                            <input
                                                list="standard-services-list"
                                                className="flex-1 text-sm font-bold bg-transparent border-none focus:ring-1 focus:ring-theme-primary px-1 py-0.5 rounded-sm outline-none"
                                                value={item?.name || ''}
                                                onChange={e => updateBillingItem(idx, 'name', e.target.value)}
                                                placeholder="請輸入或選擇服務項目..."
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-extrabold bg-stone-100 border border-stone-200 text-stone-600">
                                                    {CATEGORY_LABELS_SHORT[item.category] || '其他'}
                                                </span>
                                                <span className="text-xs text-stone-400 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    className="w-16 text-sm font-mono font-bold text-right bg-transparent border-b border-dashed border-stone-300 focus:border-theme-primary outline-none"
                                                    value={item?.price || 0}
                                                    onChange={e => updateBillingItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                                />
                                                <div className="flex items-center bg-stone-100 rounded-sm border border-stone-200">
                                                    <button onClick={() => updateBillingItem(idx, 'qty', Math.max(1, (item?.qty || 1) - 1))} className="px-2 py-0.5 hover:bg-stone-200 text-stone-600 font-bold">-</button>
                                                    <span className="text-xs font-bold w-6 text-center">{item?.qty || 0}</span>
                                                    <button onClick={() => updateBillingItem(idx, 'qty', (item?.qty || 0) + 1)} className="px-2 py-0.5 hover:bg-stone-200 text-stone-600 font-bold">+</button>
                                                </div>
                                                <span className="text-xs font-bold text-theme-text-muted">/ {item.unit || '次'}</span>
                                                <span className="font-mono font-black text-theme-text w-16 text-right">${(item.subtotal ?? 0).toFixed(1)}</span>
                                                <button onClick={() => removeBillingItem(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Payment Method */}
                            <section>
                                <h3 className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CreditCard size={12} /> 付款方式
                                </h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { id: 'cash', label: '現金' },
                                        { id: 'octopus', label: '八達通' },
                                        { id: 'credit', label: '信用卡' },
                                        { id: 'voucher', label: '醫療券' },
                                        { id: 'mixed', label: '混合' }
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id as any)}
                                            className={`py-2 rounded-sm text-[11px] font-bold border transition-all ${paymentMethod === method.id ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                                        >
                                            {method.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Voucher Claim Section */}
                            {(paymentMethod === 'voucher' || paymentMethod === 'mixed' || selectedPatient?.voucherEligible) && (
                                <section className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm animate-fade-in space-y-4">
                                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                                        <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wider">
                                            <BadgeCheck size={16} /> 醫療券核銷專區 (Elderly Voucher Claim)
                                        </h3>
                                        <div className="text-[10px] font-bold text-emerald-600">餘額: ${selectedPatient?.voucherBalance || 0}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-emerald-700 uppercase">扣除金額 (Claim Amount)</label>
                                            <input
                                                type="number"
                                                max={totalAmount}
                                                className="w-full bg-white border border-emerald-200 rounded-sm px-3 py-2 text-sm font-mono font-bold focus:border-emerald-500 outline-none"
                                                value={voucherClaimAmount}
                                                onChange={e => setVoucherClaimAmount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-emerald-700 uppercase">交易編號 (Transaction No.)</label>
                                            <input
                                                className="w-full bg-white border border-emerald-200 rounded-sm px-3 py-2 text-sm font-mono font-bold focus:border-emerald-500 outline-none"
                                                placeholder="eHealth ID..."
                                                value={voucherTransactionNo}
                                                onChange={e => setVoucherTransactionNo(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase">上傳同意書/收據相片 (Consent Form)</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="voucher-upload"
                                                className="hidden"
                                                accept="image/*,application/pdf"
                                                onChange={e => setVoucherFile(e.target.files?.[0] || null)}
                                            />
                                            <label
                                                htmlFor="voucher-upload"
                                                className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-sm cursor-pointer transition-all ${voucherFile ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-white border-emerald-200 text-emerald-500 hover:border-emerald-400'}`}
                                            >
                                                {voucherFile ? <CheckCircle2 size={16} /> : <Upload size={16} />}
                                                <span className="text-xs font-bold">{voucherFile ? `已選擇: ${voucherFile.name}` : '選擇檔案或拍攝照片...'}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {voucherClaimAmount > (selectedPatient?.voucherBalance || 0) && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-sm border border-red-100">
                                            <AlertCircle size={14} />
                                            <span className="text-[10px] font-bold">警告：扣除金額超過病患現有餘額！</span>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white border-t border-theme-border">
                            <button
                                onClick={handleActionPayment}
                                disabled={submittingPayment}
                                className="w-full py-4 bg-stone-800 text-white font-bold text-lg rounded-sm shadow-sm hover:bg-stone-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submittingPayment ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                確認結帳並更新餘額
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Receipt Modal (Expanded for Voucher) */}
            {receiptData && (
                <div className="fixed inset-0 z-[100] bg-black/80 print:bg-transparent print:static backdrop-blur-md print:backdrop-blur-none flex flex-col items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-[120mm] flex justify-end mb-4 print:hidden">
                        <button onClick={() => setReceiptData(null)} className="text-white hover:text-stone-300"><X /></button>
                    </div>
                    <div className="bg-white text-black w-full max-w-[120mm] p-8 shadow-2xl relative font-sans print:w-[120mm]">
                        <div className="text-center mb-6 border-b-2 border-black pb-4">
                            <h1 className="text-2xl font-black tracking-widest mb-1">智醫中醫診所</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Medical Receipt & Voucher Claim</p>
                        </div>
                        <div className="flex justify-between items-end mb-6 text-sm font-bold">
                            <div><span className="text-gray-500 text-xs font-normal">病患：</span>{receiptData.patientName}</div>
                            <div className="text-right text-[10px] font-mono">{receiptData.date}</div>
                        </div>
                        <div className="space-y-3 mb-6">
                            {receiptData.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span>{item?.name || ''} <span className="text-gray-400 text-xs">x{item?.qty || 0}</span></span>
                                    <span className="font-mono">${((Number(item?.price) || 0) * (Number(item?.qty) || 0)).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t-2 border-dashed border-gray-300 pt-4 mb-4 flex justify-between items-end">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Amount</span>
                            <span className="text-3xl font-black font-mono tracking-tighter">${receiptData.total.toFixed(1)}</span>
                        </div>
                        {receiptData.voucherAmount && (
                            <div className="bg-stone-50 p-3 rounded-sm border border-stone-200 mb-6 flex justify-between items-center">
                                <div className="text-[10px] font-bold text-stone-500 uppercase">Voucher Deduction</div>
                                <div className="font-mono font-black text-emerald-700">-${receiptData.voucherAmount.toFixed(1)}</div>
                            </div>
                        )}
                        <div className="text-[10px] text-gray-500 flex justify-between items-center">
                            <span>付款方式：<span className="font-bold text-black uppercase">{receiptData.method}</span></span>
                            <span>Transaction Completed</span>
                        </div>
                    </div>
                    <button
                        onClick={() => { window.print(); setReceiptData(null); }}
                        className="w-full max-w-[120mm] mt-6 py-4 bg-white text-black font-bold text-lg rounded-sm flex justify-center items-center gap-2 hover:bg-stone-100 transition-all"
                    >
                        <Printer size={20} /> 立即列印收據
                    </button>
                </div>
            )}
        </div>
    );
}