import { useState, useMemo } from 'react'
import { Calendar, ClipboardList, BookOpen, Clock, Loader2, Printer, FileText, Receipt, UserCheck, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { where } from '../../hooks/useRealtime'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import type { Appointment, UserProfile } from '../../types'
import QuickBookingModal from '../reception/components/QuickBookingModal'

const statusMap = {
  pending: { label: '待確認', variant: 'warning' },
  confirmed: { label: '已確認', variant: 'info' },
  arrived: { label: '已抵達', variant: 'teal' },
  'in-progress': { label: '進行中', variant: 'teal' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'danger' },
};



const typeMap: Record<string, string> = {
    initial: 'bg-theme-primary/10 text-theme-primary border-theme-primary/20',
    followup: 'bg-stone-100/50 text-stone-500 border-stone-200/50',
    urgent: 'bg-stone-100/10 text-stone-600 border-stone-300/30',
}

const typeLabel: Record<string, string> = {
    initial: '初診',
    followup: '覆診',
    urgent: '急診',
}

export default function DoctorDashboard() {
    const navigate = useNavigate()
    const { userProfile } = useAuth()
    const clinicId = userProfile?.clinicId || ''
    const doctorId = userProfile?.id || ''

    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const today = new Date()
    const { data: rawAppointments, loading } = useRealtime<Appointment>(
        'appointments',
        clinicId,
        [
            where('doctorId', '==', doctorId),
            where('dateStr', '==', todayStr)
        ]
    )

    const { data: doctors } = useRealtime<UserProfile>(
        'users',
        clinicId,
        [where('role', '==', 'doctor')]
    )

    const appointments = useMemo(() => {
        if (!rawAppointments) return []
        return [...rawAppointments]
            .filter(a => a && a.status !== 'cancelled')
            .sort((a, b) => {
                const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
                const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
                return timeA - timeB
            })
    }, [rawAppointments])

    const completed = appointments.filter(a => a.status === 'completed').length
    const total = appointments.length

    const handleRowClick = (id: string) => {
        setSelectedId(id === selectedId ? null : id)
    }

    const handleDoubleClick = (id: string) => {
        navigate(`/doctor/consultation/${id}`)
    }

    const startConsultation = () => {
        if (selectedId) {
            navigate(`/doctor/consultation/${selectedId}`)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in relative pb-10">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-theme-text">醫師控制台</h2>
                    <p className="text-theme-text-muted text-sm mt-0.5">
                        今日 {today.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsBookingModalOpen(true)}
                        className="btn-primary gap-2 h-9 shadow-sm"
                    >
                        <Plus size={18} />
                        <span>快速掛號</span>
                    </button>
                    <button
                        onClick={startConsultation}
                        disabled={!selectedId}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-sm font-bold transition-all
                            ${selectedId ? 'bg-theme-primary text-theme-surface shadow-md hover:opacity-90 active:scale-95' : 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-50'}`}
                    >
                        <ClipboardList size={18} />
                        開始問診
                    </button>
                </div>
            </div>

            {/* Quick Document Print Bar */}
            <div className={`card p-3 flex items-center gap-2 transition-all duration-300 border-l-4 ${selectedId ? 'border-theme-primary bg-theme-primary/5' : 'border-stone-200 opacity-60'}`}>
                <div className="flex items-center gap-2 px-3 border-r border-stone-200">
                    <Printer size={16} className={selectedId ? 'text-theme-primary' : 'text-stone-400'} />
                    <span className="text-xs font-bold text-stone-500">文件套印</span>
                </div>
                <div className="flex gap-2">
                    {[
                        { icon: FileText, label: '列印處方', color: 'hover:text-theme-primary' },
                        { icon: UserCheck, label: '病假證明', color: 'hover:text-theme-primary' },
                        { icon: FileText, label: '到診證明', color: 'hover:text-theme-primary' },
                        { icon: Receipt, label: '收據', color: 'hover:text-theme-primary' },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            disabled={!selectedId}
                            onClick={() => alert(`正在生成：${btn.label}`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all border border-transparent
                                ${selectedId ? `bg-stone-50 text-stone-600 ${btn.color} hover:border-stone-200` : 'text-stone-400 cursor-not-allowed'}`}
                        >
                            <btn.icon size={14} />
                            {btn.label}
                        </button>
                    ))}
                </div>
                {selectedId && (
                    <div className="ml-auto flex items-center gap-2 pr-2">
                        <span className="text-[10px] font-bold text-theme-primary">已選取：{appointments.find(a => a.id === selectedId)?.patientName}</span>
                    </div>
                )}
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: '今日預約', value: `${total}`, icon: Calendar, color: 'text-theme-primary', bg: 'bg-theme-primary/10' },
                    { label: '已完成', value: `${completed}`, icon: ClipboardList, color: 'text-stone-500', bg: 'bg-stone-100' },
                    { label: '待診', value: `${total - completed}`, icon: Clock, color: 'text-stone-500', bg: 'bg-stone-100' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="card p-4 flex items-center gap-3 rounded-sm">
                        <div className={`${bg} p-2 rounded-sm`}>
                            <Icon size={18} className={color} />
                        </div>
                        <div>
                            <p className="text-theme-text-muted text-xs">{label}</p>
                            <p className="text-theme-text text-xl font-bold">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Appointment list */}
                <div className="card p-4 lg:col-span-2 rounded-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-theme-text font-semibold text-sm">今日預約時間表 <span className="text-[10px] text-theme-text-muted font-normal ml-2">(按一下選取 / 雙擊進入)</span></h3>
                        <button onClick={() => navigate('/nurse/appointments')} className="text-theme-primary hover:opacity-80 text-xs transition-colors">查看日曆 →</button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-stone-400" />
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-8 text-stone-400 text-sm">今日尚無預約</div>
                    ) : (
                        <div className="space-y-2">
                            {appointments.map((appt) => {
                                const time = new Date(appt.scheduledAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false });
                                const isSelected = selectedId === appt.id;
                                return (
                                    <div
                                        key={appt.id}
                                        onClick={() => handleRowClick(appt.id!)}
                                        onDoubleClick={() => handleDoubleClick(appt.id!)}
                                        className={`flex items-center gap-2 p-2 rounded-sm transition-all cursor-pointer select-none group
                                            ${isSelected ? 'bg-theme-primary/10 ring-1 ring-theme-primary shadow-sm scale-[1.01] z-10 relative' : 'bg-stone-50 hover:bg-stone-100 border border-transparent'}
                                            ${appt.status === 'in-progress' && !isSelected ? 'border-theme-primary/30' : ''}`}
                                    >
                                        <span className={`text-xs w-12 shrink-0 ${isSelected ? 'text-theme-primary font-bold' : 'text-stone-500'}`}>{time}</span>
                                        <span className={`text-sm font-bold flex-1 ${isSelected ? 'text-theme-text' : 'text-stone-600'}`}>{(appt as any).patientName || '未知病人'}</span>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] border transition-colors ${isSelected ? 'bg-theme-primary/10 text-theme-primary border-theme-primary/20 font-bold' : typeMap[appt.type]}`}>
                                            {typeLabel[appt.type]}
                                        </span>
                                        <Badge variant={isSelected ? 'teal' : ((statusMap[appt.status]?.variant || 'info') as any)}>
                                            {statusMap[appt.status]?.label || appt.status}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick access */}
                <div className="card p-4 rounded-sm">
                    <h3 className="text-theme-text font-semibold text-sm mb-3">快速入口</h3>
                    <div className="space-y-2">
                        {[
                            { icon: ClipboardList, label: '問診記錄', sub: '查看歷史記錄', color: 'text-stone-600', bg: 'bg-stone-100' },
                            { icon: BookOpen, label: '傷寒論', sub: '經典條文查詢', color: 'text-stone-600', bg: 'bg-stone-100' },
                            { icon: BookOpen, label: '本草綱目', sub: '藥材資料庫', color: 'text-stone-600', bg: 'bg-stone-100' },
                        ].map(({ icon: Icon, label, sub, color, bg }) => (
                            <button key={label} className="w-full flex items-center gap-3 p-2 rounded-sm hover:bg-stone-50 transition-colors text-left group">
                                <div className={`${bg} p-2 rounded-sm group-hover:scale-105 transition-transform`}>
                                    <Icon size={15} className={color} />
                                </div>
                                <div>
                                    <p className="text-theme-text text-sm font-medium">{label}</p>
                                    <p className="text-theme-text-muted text-xs">{sub}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <QuickBookingModal 
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                doctors={doctors}
                clinicId={clinicId}
                initialDoctorId={doctorId}
                initialTime=""
            />
        </div>
    )
}