import { useState, useEffect, useRef, useMemo } from 'react';
import { UserPlus, Clock, User, Loader2, Search, Check } from 'lucide-react';
import { where } from '../hooks/useRealtime';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { appointmentService } from '../services/appointmentService';
import type { Appointment, Patient } from '../types';
import { format, parse, setHours, setMinutes } from 'date-fns';
// 這裡確認你的 MiniCalendar 路徑正確，如果報錯請改回 './ui/MiniCalendar' 或 '../components/ui/MiniCalendar'
import MiniCalendar from '../components/ui/MiniCalendar';

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
});

interface LocalDoctor {
    id: string;
    displayName: string;
}

export default function AppointmentCalendar() {
    const { userProfile } = useAuth();
    const clinicId = userProfile?.clinicId || '';

    // 選定的日期 (字串格式)
    const [selectedDateStr, setSelectedDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));

    // 🔥 實時訂閱選定日期的預約
    const { data: todaysAppointments, loading } = useRealtime<Appointment>(
        'appointments',
        clinicId,
        [
            where('dateStr', '==', selectedDateStr)
        ]
    );
    const { data: allPatients } = useRealtime<Patient>('patients', clinicId);

    const [doctors, setDoctors] = useState<LocalDoctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);

    const [formData, setFormData] = useState({
        id: '',
        patientName: '',
        patientId: '',
        phone: '',
        doctorId: '',
        time: '09:00',
        type: 'initial' as Appointment['type'],
        status: 'pending' as Appointment['status']
    });

    // Patient Picker logic
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const filteredPatients = useMemo(() => {
        if (!allPatients) return [];
        const term = formData.patientName.toLowerCase();
        return allPatients.filter(p => {
            return p.name.toLowerCase().includes(term) || p.phone.includes(term);
        }).slice(0, 5);
    }, [allPatients, formData.patientName]);

    // 取得所有醫師
    useEffect(() => {
        const fetchDoctors = async () => {
            if (!clinicId) return;
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('clinic_id', clinicId)
                    .eq('role', 'doctor');
                if (error) throw error;
                const docs = (data || []).map(d => ({
                    id: d.id,
                    // 🔥 這裡已經修正：對齊資料庫真正的欄位名稱 `name`
                    displayName: d.name || d.display_name || '未命名醫師'
                }));
                setDoctors(docs);
                if (docs.length > 0) {
                    setFormData(prev => ({ ...prev, doctorId: docs[0].id }));
                }
            } catch (error) {
                console.error("載入醫師名單失敗:", error);
            } finally {
                setLoadingDoctors(false);
            }
        };
        fetchDoctors();
    }, [clinicId]);

    // 點擊外部關閉選取器
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setIsPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const statusConfig: Record<string, { label: string; color: string }> = {
        'pending': { label: '待確認', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
        'confirmed': { label: '已預約', color: 'bg-theme-primary/10 text-theme-primary border-theme-primary/20 font-bold hover:bg-theme-primary/20' },
        'in-progress': { label: '看診中', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
        'completed': { label: '已完成', color: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100' },
        'cancelled': { label: '已取消', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'patientName') setIsPickerOpen(true);
    };

    const selectPatient = (p: Patient) => {
        setFormData(prev => ({
            ...prev,
            patientId: p.id || '',
            patientName: p.name,
            phone: p.phone,
            type: 'followup'
        }));
        setIsPickerOpen(false);
    };

    const handleSelectAppointment = (appt: Appointment) => {
        const date = new Date(appt.scheduledAt);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        setFormData({
            id: appt.id || '',
            patientName: appt.patientName || '未知',
            patientId: appt.patientId,
            phone: '',
            doctorId: appt.doctorId,
            time: timeStr,
            type: appt.type,
            status: appt.status
        });
    };

    const resetForm = () => {
        setFormData({
            id: '', patientName: '', patientId: '', phone: '',
            doctorId: doctors[0]?.id || '', time: '09:00', type: 'initial', status: 'pending'
        });
    };

    const handleBook = async () => {
        if (!formData.patientName.trim()) return alert('請輸入病人姓名！');
        if (!formData.patientId) return alert('請從選取器中選擇一名現有病人。');
        if (!clinicId) return;

        const [hour, minute] = formData.time.split(':').map(Number);
        const parsedDate = parse(selectedDateStr, 'yyyy-MM-dd', new Date());
        const scheduledDate = setMinutes(setHours(parsedDate, hour), minute);

        const apptData = {
            patientId: formData.patientId,
            patientName: formData.patientName,
            doctorId: formData.doctorId,
            scheduledAt: scheduledDate.toISOString(), // 修正為 ISO String，避免 Firebase Timestamp 錯誤
            dateStr: selectedDateStr,
            duration: 30,
            status: 'pending' as const,
            type: formData.type,
            source: 'internal' as const
        };

        try {
            if (formData.id) {
                await appointmentService.update(formData.id, apptData as any);
                alert('更新成功！');
            } else {
                await appointmentService.create(clinicId, apptData as any);
                alert('預約掛號成功！');
            }
            resetForm();
        } catch (error) {
            console.error("操作失敗:", error);
            alert("操作失敗");
        }
    };

    const handleArrive = async () => {
        if (!formData.id) return alert('請先選取預約');
        try {
            await appointmentService.update(formData.id, { status: 'arrived' });
            alert('病人已報到');
            resetForm();
        } catch (error) {
            console.error("報到失敗:", error);
        }
    };

    const handleCancel = async () => {
        if (!formData.id) return;
        if (window.confirm(`確定要取消預約嗎？`)) {
            try {
                await appointmentService.update(formData.id, { status: 'cancelled' });
                resetForm();
            } catch (error) {
                console.error("取消失敗:", error);
            }
        }
    };

    if (loadingDoctors) {
        return (
            <div className="flex-1 flex items-center justify-center bg-theme-bg text-theme-text-muted">
                <Loader2 className="animate-spin mr-2" size={24} />
                正在載入預約時程...
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4 animate-fade-in pb-2 overflow-hidden">
            <div className="w-[30%] flex flex-col gap-4 overflow-hidden">
                {/* Mini Calendar */}
                <MiniCalendar
                    selectedDate={selectedDateStr}
                    onDateSelect={(date) => {
                        setSelectedDateStr(date);
                        resetForm();
                    }}
                />

                {/* Form Area */}
                <div className="bg-theme-bg border border-theme-border rounded-sm p-4 flex-1 flex flex-col shadow-sm overflow-y-auto custom-scrollbar relative">
                    <h3 className="text-theme-primary font-bold flex items-center gap-2 mb-4 border-b border-theme-border pb-2">
                        <UserPlus size={16} /> {formData.id ? '修改 / 報到管理' : '快速登記 / 掛號'}
                    </h3>

                    {formData.id && (
                        <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded font-bold flex justify-between items-center">
                            正在編輯: {formData.patientName}
                            <button onClick={resetForm} className="text-emerald-700 underline">取消選取</button>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex flex-col gap-1 relative" ref={pickerRef}>
                                <label className="text-[11px] font-bold text-theme-text-muted">搜尋病人 (姓名/電話)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={e => handleInputChange('patientName', e.target.value)}
                                        onFocus={() => setIsPickerOpen(true)}
                                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-theme-surface border border-theme-border rounded focus:border-theme-primary outline-none text-theme-text"
                                        placeholder="輸入姓名或電話搜尋..."
                                    />
                                    <Search className="absolute left-2.5 top-2 text-theme-text-muted" size={14} />
                                    {formData.patientId && <Check className="absolute right-2.5 top-2 text-emerald-500" size={14} />}
                                </div>

                                {isPickerOpen && formData.patientName.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-theme-surface border border-theme-border rounded-sm shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                        {filteredPatients.length > 0 ? (
                                            filteredPatients.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => selectPatient(p)}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-theme-primary/10 flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-bold text-theme-text group-hover:text-theme-primary">{p.name}</div>
                                                        <div className="text-[10px] text-theme-text-muted">{p.phone}</div>
                                                    </div>
                                                    <div className="text-[10px] bg-theme-bg px-1.5 py-0.5 rounded border border-theme-border text-theme-text-muted">現有病患</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-center">
                                                <p className="text-xs text-theme-text-muted">找不到匹配的病人</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-theme-text-muted">預約醫師</label>
                                <select value={formData.doctorId} onChange={e => handleInputChange('doctorId', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-theme-surface border border-theme-border rounded focus:border-theme-primary outline-none text-theme-text">
                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-bold text-theme-text-muted">預約時間</label>
                                <select value={formData.time} onChange={e => handleInputChange('time', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-theme-surface border border-theme-border rounded focus:border-theme-primary outline-none text-theme-text">
                                    {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-theme-text-muted">診次類別</label>
                            <select value={formData.type} onChange={e => handleInputChange('type', e.target.value)} className="w-full px-2 py-1.5 text-sm bg-theme-surface border border-theme-border rounded focus:border-theme-primary outline-none text-theme-text">
                                <option value="initial">初診</option>
                                <option value="followup">覆診</option>
                                <option value="urgent">急診</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-theme-border mt-2">
                            <button onClick={handleBook} className="py-2 bg-theme-primary text-white rounded-sm font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
                                {formData.id ? '儲存修改' : '確認掛號'}
                            </button>
                            <button onClick={handleArrive} disabled={!formData.id} className="py-2 bg-theme-surface border border-theme-border text-theme-text rounded-sm font-bold text-sm hover:bg-theme-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                病人報到
                            </button>
                            <button onClick={handleCancel} disabled={!formData.id} className="py-2 bg-theme-surface border border-theme-border text-red-600 rounded-sm font-bold text-sm hover:bg-red-50 transition-colors col-span-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                取消預約 / 刪除
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Grid View */}
            <div className="w-[70%] bg-theme-surface border border-theme-border rounded-sm shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-theme-border flex justify-between items-center bg-theme-bg">
                    <h2 className="text-theme-text font-bold text-lg flex items-center gap-2">
                        <Clock className="text-theme-primary" size={20} /> {selectedDateStr} 候診時間表
                    </h2>
                    <div className="flex gap-3 text-[10px] font-bold">
                        {Object.entries(statusConfig).map(([key, config]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <span className={`w-3 h-3 rounded-sm border ${config.color.split(' ')[0]} ${config.color.split(' ')[2]}`}></span>
                                <span className="text-theme-text-muted">{config.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex border-b border-theme-border bg-theme-surface sticky top-0 z-10">
                    <div className="w-[80px] shrink-0 border-r border-theme-border bg-theme-bg"></div>
                    {doctors.map(doctor => (
                        <div key={doctor.id} className="flex-1 text-center py-2 text-sm font-bold text-theme-primary border-r border-theme-border last:border-0 bg-theme-primary/5">
                            {doctor.displayName}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-theme-surface">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-theme-text-muted" size={32} />
                        </div>
                    ) : (
                        TIME_SLOTS.map(time => (
                            <div key={time} className="flex border-b border-theme-border hover:bg-theme-bg/50 transition-colors">
                                <div className="w-[80px] shrink-0 border-r border-theme-border py-2 text-center text-xs font-bold text-theme-text-muted bg-theme-bg flex items-center justify-center">
                                    {time}
                                </div>
                                {doctors.map(doctor => {
                                    const appt = todaysAppointments.find(a => {
                                        const d = new Date(a.scheduledAt);
                                        const t = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                        return t === time && a.doctorId === doctor.id;
                                    });
                                    return (
                                        <div key={`${time}-${doctor.id}`} className="flex-1 border-r border-theme-border last:border-0 p-1 relative min-h-[44px]">
                                            {appt && (
                                                <div
                                                    onClick={() => handleSelectAppointment(appt)}
                                                    className={`w-full h-full px-2 py-1 rounded-sm text-xs font-bold flex flex-col justify-center border cursor-pointer transition-colors shadow-sm ${statusConfig[appt.status]?.color || ''}`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={12} className="opacity-70" />
                                                        <span className="truncate">{appt.patientName}</span>
                                                    </div>
                                                    <span className="text-[10px] font-normal opacity-80 ml-4">
                                                        {appt.type === 'initial' ? '初診' : appt.type === 'followup' ? '覆診' : '急診'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}