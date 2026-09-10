import { useState, useMemo } from 'react'
import {
    Plus,
    User,
    Clock,
    Calendar as CalendarIcon,
    CheckCircle2,
    Loader2
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import { appointmentService } from '../../services/appointmentService'
import type { Appointment, UserProfile } from '../../types'
import { format, parse } from 'date-fns'
import { zhHK } from 'date-fns/locale'
import { where } from '../../hooks/useRealtime'
import Badge from '../../components/ui/Badge'
import QuickBookingModal from './components/QuickBookingModal'
import MiniCalendar from '../../components/ui/MiniCalendar'

export default function ReceptionDashboard() {
    const { userProfile } = useAuth()
    const clinicId = userProfile?.clinicId || ''

    const [selectedDateStr, setSelectedDateStr] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

    const [preFillDoctorId, setPreFillDoctorId] = useState('')
    const [preFillTime, setPreFillTime] = useState('')

    const todayStr = format(new Date(), 'yyyy-MM-dd')

    // 🔥 終極修復：只開啟「一個」預約監聽器，避免 Supabase 頻道衝突崩潰
    const { data: allAppointments, loading } = useRealtime<Appointment>(
        'appointments',
        clinicId
    )

    // 💡 前端自行篩選：排班視圖需要的日期
    const viewAppointments = useMemo(() => {
        return allAppointments.filter(appt => appt.dateStr === selectedDateStr)
    }, [allAppointments, selectedDateStr])

    // 💡 前端自行篩選：今日報到佇列需要的日期
    const todayAppointments = useMemo(() => {
        return allAppointments.filter(appt => appt.dateStr === todayStr)
    }, [allAppointments, todayStr])

    // 監聽醫師名單
    const { data: doctors } = useRealtime<UserProfile>(
        'users',
        clinicId,
        [where('role', '==', 'doctor')]
    )

    const handleQuickBook = (docId: string, timeStr: string) => {
        setPreFillDoctorId(docId)
        setPreFillTime(timeStr)
        setIsBookingModalOpen(true)
    }

    const handleOpenGeneralBooking = () => {
        setPreFillDoctorId('')
        setPreFillTime('')
        setIsBookingModalOpen(true)
    }

    const handleCheckIn = async (id: string) => {
        try {
            await appointmentService.update(id, { status: 'arrived' })
        } catch (err) {
            console.error('Check-in error:', err)
        }
    }

    const selectedDateObj = parse(selectedDateStr, 'yyyy-MM-dd', new Date())

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-theme-text flex items-center gap-2">
                        前台掛號總機
                    </h2>
                    <div className="flex items-center bg-theme-surface border border-theme-border rounded-sm px-2 py-1 gap-3">
                        <span className="text-sm font-bold min-w-[120px] text-center">
                            {format(selectedDateObj, 'yyyy年MM月dd日 (eeee)', { locale: zhHK })}
                        </span>
                        <button
                            onClick={() => setSelectedDateStr(todayStr)}
                            className="text-xs px-2 py-0.5 bg-theme-surface-alt text-theme-text font-medium hover:bg-theme-border transition-colors rounded-sm border border-theme-border"
                        >
                            今日
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenGeneralBooking}
                        className="btn-primary gap-2 h-9 shadow-sm"
                    >
                        <Plus size={18} />
                        <span>新增預約</span>
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">

                {/* Left: Mini Calendar */}
                <div className="col-span-12 lg:col-span-2 flex flex-col gap-4">
                    <MiniCalendar
                        selectedDate={selectedDateStr}
                        onDateSelect={setSelectedDateStr}
                    />

                    <div className="bg-theme-surface border border-theme-border rounded-sm p-3 space-y-2">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-2">狀態圖例</p>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-theme-text">
                            <div className="w-2 h-2 bg-theme-surface-alt border border-theme-border"></div>
                            <span>待診 (Pending)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-theme-text">
                            <div className="w-2 h-2 bg-theme-primary/20 border border-theme-primary/30"></div>
                            <span>已報到 (Arrived)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-theme-text">
                            <div className="w-2 h-2 bg-stone-100 border border-stone-200"></div>
                            <span>已完成 (Done)</span>
                        </div>
                    </div>
                </div>

                {/* Center: Time Grid */}
                <div className="col-span-12 lg:col-span-7 flex flex-col bg-theme-surface border border-theme-border rounded-sm overflow-hidden">
                    <div className="p-3 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt/50">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <CalendarIcon size={14} className="text-theme-primary" />
                            排班視圖
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="animate-spin text-theme-text-muted" size={32} />
                            </div>
                        ) : (
                            <TimeGridView
                                appointments={viewAppointments}
                                doctors={doctors}
                                selectedDate={selectedDateObj}
                                onQuickBook={handleQuickBook}
                            />
                        )}
                    </div>
                </div>

                {/* Right: Today's Queue */}
                <div className="col-span-12 lg:col-span-3 flex flex-col bg-theme-surface border border-theme-border rounded-sm overflow-hidden">
                    <div className="p-3 border-b border-theme-border bg-theme-surface-alt/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Clock size={14} className="text-theme-primary" />
                            今日報到佇列
                        </h3>
                        <span className="bg-theme-primary text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold">
                            {todayAppointments.filter(a => a.status === 'pending').length} 待辦
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {todayAppointments.length === 0 ? (
                            <div className="text-center py-10 text-theme-text-muted text-xs">
                                今日尚無預約資料
                            </div>
                        ) : (
                            todayAppointments
                                .filter(appt => appt.status !== 'cancelled')
                                .sort((a, b) => {
                                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                                    const timeA = new Date(a.scheduledAt as string).getTime();
                                    const timeB = new Date(b.scheduledAt as string).getTime();
                                    return timeA - timeB;
                                })
                                .map(appt => (
                                    <div
                                        key={appt.id}
                                        className={`p-2 border rounded-sm transition-all group ${appt.status === 'pending'
                                            ? 'border-theme-border bg-theme-surface hover:border-theme-primary/50'
                                            : 'border-transparent bg-theme-surface-alt/30 opacity-70'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-xs font-bold text-theme-text truncate">
                                                        {appt.patientName}
                                                    </span>
                                                    <Badge variant={appt.type === 'initial' ? 'warning' : 'info'}>
                                                        {appt.type === 'initial' ? '初' : '覆'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-theme-text-muted font-medium">
                                                    <span className="flex items-center gap-0.5">
                                                        <Clock size={10} />
                                                        {format(new Date(appt.scheduledAt), 'HH:mm')}
                                                    </span>
                                                    <span className="flex items-center gap-0.5">
                                                        <User size={10} />
                                                        {/* 對齊 name 欄位 */}
                                                        {(doctors.find(d => d.id === appt.doctorId) as any)?.name || doctors.find(d => d.id === appt.doctorId)?.displayName || '醫師'}
                                                    </span>
                                                </div>
                                            </div>

                                            {appt.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCheckIn(appt.id!)}
                                                    className="flex items-center gap-1 px-2 py-1 bg-theme-primary/10 text-theme-primary text-[10px] font-bold rounded-sm border border-theme-primary/20 hover:bg-theme-primary hover:text-white transition-all shrink-0"
                                                >
                                                    報到
                                                </button>
                                            )}
                                            {appt.status === 'arrived' && (
                                                <div className="text-theme-primary flex items-center gap-1 px-1 py-1 shrink-0">
                                                    <CheckCircle2 size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            {isBookingModalOpen && (
                <QuickBookingModal
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    doctors={doctors}
                    clinicId={clinicId}
                    initialDate={selectedDateStr}
                    initialDoctorId={preFillDoctorId}
                    initialTime={preFillTime}
                />
            )}
        </div>
    )
}

function TimeGridView({ appointments, doctors, selectedDate: _selectedDate, onQuickBook }: {
    appointments: Appointment[],
    doctors: UserProfile[],
    selectedDate: Date,
    onQuickBook: (docId: string, time: string) => void
}) {
    const startHour = 9;
    const endHour = 19;
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        slots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const gridData = useMemo(() => {
        const data: Record<string, Record<number, Appointment>> = {};
        doctors.forEach(doc => {
            data[doc.id] = {};
        });

        appointments.forEach(appt => {
            const date = new Date(appt.scheduledAt);
            const h = date.getHours();
            const m = date.getMinutes();

            const totalMinutes = (h - startHour) * 60 + m;
            const slotIndex = Math.floor(totalMinutes / 30);

            if (slotIndex >= 0 && slotIndex < slots.length && data[appt.doctorId]) {
                data[appt.doctorId][slotIndex] = appt;
            }
        });
        return data;
    }, [appointments, doctors, slots.length]);

    if (doctors.length === 0) {
        return <div className="h-full flex items-center justify-center text-theme-text-muted text-sm">無醫師排班資料</div>;
    }

    return (
        <div className="min-w-max">
            <div className="flex border-b border-theme-border sticky top-0 bg-theme-surface z-20">
                <div className="w-16 shrink-0 border-r border-theme-border bg-theme-surface-alt/30"></div>
                {doctors.map(doc => (
                    <div key={doc.id} className="flex-1 min-w-[150px] p-2 text-center border-r border-theme-border last:border-r-0">
                        {/* 對齊 name 欄位 */}
                        <p className="text-xs font-bold text-theme-text">{(doc as any).name || doc.displayName}</p>
                        <p className="text-[10px] text-theme-text-muted">{doc.specialization || '中醫師'}</p>
                    </div>
                ))}
            </div>

            <div className="flex">
                <div className="w-16 shrink-0 bg-theme-surface-alt/10">
                    {slots.map((slot, i) => (
                        <div key={slot} className={`h-12 border-r border-b border-theme-border flex items-start justify-center pt-1 ${i % 2 === 0 ? 'bg-theme-surface' : 'bg-theme-surface-alt/20'}`}>
                            <span className="text-[10px] font-bold text-theme-text-muted">{slot}</span>
                        </div>
                    ))}
                </div>

                {doctors.map(doc => (
                    <div key={doc.id} className="flex-1 min-w-[150px] relative">
                        {slots.map((slot, i) => {
                            const appt = gridData[doc.id]?.[i];
                            return (
                                <div
                                    key={slot}
                                    className={`h-12 border-r border-b border-theme-border relative group last:border-r-0 ${i % 2 === 1 ? 'bg-theme-surface-alt/5' : ''}`}
                                >
                                    {appt && (
                                        <div className={`absolute inset-0.5 m-px p-1.5 border rounded-sm text-[10px] flex flex-col leading-tight transition-all z-10 ${appt.status === 'completed'
                                            ? 'bg-stone-100 text-stone-500 border-stone-200'
                                            : appt.status === 'arrived' || appt.status === 'in-progress'
                                                ? 'bg-theme-primary/10 text-theme-primary border-theme-primary/20 font-bold'
                                                : 'bg-theme-surface-alt text-theme-text border-theme-border shadow-sm'
                                            }`}>
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold truncate">{appt.patientName}</span>
                                                <span className="opacity-60 scale-90">{appt.type === 'initial' ? '初' : '覆'}</span>
                                            </div>
                                            <div className="opacity-70 truncate">{appt.notes || '一般就診'}</div>
                                        </div>
                                    )}
                                    {!appt && (
                                        <div
                                            onClick={() => onQuickBook(doc.id, slot)}
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-theme-primary/5 cursor-pointer flex items-center justify-center transition-opacity"
                                        >
                                            <Plus size={12} className="text-theme-primary/40" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}