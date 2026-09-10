import { useState } from 'react'
import { Calendar, Users, Phone, Plus, Printer, FileText, Receipt, UserCheck, Search } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import type { Appointment } from '../../types'

const statusMap: Record<string, { label: string; variant: string }> = {
    completed: { label: '已完成', variant: 'success' },
    'in-progress': { label: '診症中', variant: 'teal' },
    confirmed: { label: '已確認', variant: 'info' },
    pending: { label: '待確認', variant: 'warning' },
    arrived: { label: '已報到', variant: 'teal' },
    cancelled: { label: '取消', variant: 'danger' },
}

export default function NurseDashboard() {
    const { userProfile } = useAuth()
    const clinicId = userProfile?.clinicId || ''
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const { data: allAppointments, loading } = useRealtime<Appointment>('appointments', clinicId)

    const today = new Date()
    const upcomingAppointments = allAppointments.filter(a => {
        const scheduledDate = new Date(a.scheduledAt)
        return scheduledDate.toDateString() === today.toDateString() && a.status !== 'cancelled'
    }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

    const stats = {
        total: upcomingAppointments.length,
        waiting: upcomingAppointments.filter(a => a.status === 'confirmed').length,
        completed: upcomingAppointments.filter(a => a.status === 'completed').length
    }

    const handleRowClick = (id: string) => {
        setSelectedId(id === selectedId ? null : id)
    }

    return (
        <div className="space-y-6 animate-fade-in relative pb-10">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-theme-text">護士控制台</h2>
                    <p className="text-theme-text-muted text-sm mt-0.5">{today.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2 bg-stone-100 text-stone-600 rounded-sm font-bold border border-stone-200 hover:bg-stone-200 transition-all">
                        <Search size={16} /> 搜尋病人
                    </button>
                    <button className="btn-primary flex items-center gap-2 px-6 py-2">
                        <Plus size={18} /> 新增預約
                    </button>
                </div>
            </div>

            {/* Quick Document Print Bar */}
            <div className={`card p-3 flex items-center gap-4 transition-all duration-300 border-l-4 ${selectedId ? 'border-theme-primary bg-theme-primary/5 shadow-lg shadow-theme-primary/5' : 'border-stone-200 opacity-60'}`}>
                <div className="flex items-center gap-2 px-3 border-r border-stone-200">
                    <Printer size={16} className={selectedId ? 'text-theme-primary' : 'text-stone-400'} />
                    <span className="text-xs font-bold text-stone-500">列印文件</span>
                </div>
                <div className="flex gap-2">
                    {[
                        { icon: Receipt, label: '收據與發票', color: 'hover:text-theme-primary' },
                        { icon: FileText, label: '報到條碼', color: 'hover:text-theme-primary' },
                        { icon: UserCheck, label: '排隊憑證', color: 'hover:text-theme-primary' },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            disabled={!selectedId}
                            onClick={() => alert(`正在列印：${btn.label}`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all border border-transparent
                                ${selectedId ? `bg-stone-50 text-stone-600 ${btn.color} hover:border-stone-200 shadow-sm` : 'text-stone-400 cursor-not-allowed'}`}
                        >
                            <btn.icon size={14} />
                            {btn.label}
                        </button>
                    ))}
                </div>
                {selectedId && (
                    <div className="ml-auto flex items-center gap-2 pr-2">
                        <span className="text-[10px] font-bold text-theme-primary animate-pulse uppercase tracking-wider">SELECTED: {upcomingAppointments.find(a => a.id === selectedId)?.patientName}</span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: '今日預約', value: stats.total, icon: Calendar, color: 'text-theme-primary', bg: 'bg-theme-primary/10' },
                    { label: '等候中', value: stats.waiting, icon: Users, color: 'text-stone-500', bg: 'bg-stone-100' },
                    { label: '已完成', value: stats.completed, icon: Phone, color: 'text-stone-500', bg: 'bg-stone-100' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="card p-4 flex items-center gap-3 rounded-sm">
                        <div className={`${bg} p-2.5 rounded-sm`}>
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
                {/* Upcoming appointments */}
                <div className="card p-4 lg:col-span-2 rounded-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-theme-text font-semibold text-sm">今日餘下預約 <span className="text-[10px] text-theme-text-muted font-normal ml-2">(點選病人以執行快速列印操作)</span></h3>
                        <button className="text-theme-primary hover:text-theme-primary/80 text-xs transition-colors underline underline-offset-4">開啟全量日曆 →</button>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-400" /></div>
                    ) : (
                        <div className="space-y-2">
                            {upcomingAppointments.map((appt) => {
                                const time = new Date(appt.scheduledAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false });
                                const isSelected = selectedId === appt.id;
                                return (
                                    <div
                                        key={appt.id}
                                        onClick={() => handleRowClick(appt.id!)}
                                        className={`flex items-center gap-3 p-3 rounded-sm transition-all cursor-pointer select-none group border
                                            ${isSelected ? 'bg-theme-primary/10 border-theme-primary ring-1 ring-theme-primary/20 scale-[1.01] shadow-md shadow-theme-primary/5' : 'bg-stone-50 hover:bg-stone-100 border-transparent'}
                                            ${appt.status === 'in-progress' && !isSelected ? 'border-theme-primary/30' : ''}`}
                                    >
                                        <span className={`text-xs font-mono w-12 shrink-0 ${isSelected ? 'text-theme-primary font-bold' : 'text-stone-500'}`}>{time}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold ${isSelected ? 'text-theme-text' : 'text-stone-600'}`}>{appt.patientName}</p>
                                            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold opacity-70">醫生已到診 · {appt.type === 'initial' ? '初診' : '覆診'}</p>
                                        </div>
                                        <Badge variant={isSelected ? 'info' : ((statusMap[appt.status]?.variant || 'info') as any)}>{statusMap[appt.status]?.label}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick actions or info (Reserved for Nurse) */}
                <div className="card p-4 rounded-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-theme-text font-semibold text-sm">快捷行政操作</h3>
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: '掛號報到', icon: UserCheck, color: 'text-stone-600', bg: 'bg-stone-100' },
                            { label: '今日收費清單', icon: Receipt, color: 'text-stone-600', bg: 'bg-stone-100' },
                            { label: '診所排程管理', icon: Calendar, color: 'text-stone-600', bg: 'bg-stone-100' },
                        ].map((item, i) => (
                            <button key={i} className="w-full flex items-center gap-3 p-2 rounded-sm hover:bg-stone-50 transition-all text-left group">
                                <div className={`${item.bg} p-2 rounded-sm group-hover:scale-105 transition-transform`}>
                                    <item.icon size={15} className={item.color} />
                                </div>
                                <span className="text-sm font-bold text-theme-text">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

const Loader2 = ({ className }: { className?: string }) => <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>;
