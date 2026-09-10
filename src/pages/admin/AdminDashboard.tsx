import { Calendar, Users, Receipt, TrendingUp, AlertTriangle } from 'lucide-react'
import Badge from '../../components/ui/Badge'

const stats = [
    { label: '本月預約', value: '248', sub: '+12% 較上月', icon: Calendar, color: 'text-theme-primary', bg: 'bg-theme-primary/10' },
    { label: '在冊病人', value: '1,042', sub: '本月新增 18人', icon: Users, color: 'text-stone-500', bg: 'bg-stone-100' },
    { label: '本月收入', value: 'HK$68,400', sub: '+8% 較上月', icon: TrendingUp, color: 'text-stone-500', bg: 'bg-stone-100' },
    { label: '待入賬帳單', value: '14', sub: '3 份逾期', icon: Receipt, color: 'text-stone-500', bg: 'bg-stone-100' },
]

const recentActivity = [
    { time: '10:30', desc: '陳大文 — 已完成診症', type: 'success' as const },
    { time: '11:00', desc: '李小花 — 已確認預約', type: 'info' as const },
    { time: '11:45', desc: '庫存警報：桂枝 低於補貨線', type: 'warning' as const },
    { time: '13:00', desc: '王志明 — 新病人登記', type: 'info' as const },
    { time: '14:15', desc: '發票 #INV-0042 已支付', type: 'success' as const },
]

const lowStock = [
    { name: '桂枝', stock: '120g', threshold: '200g' },
    { name: '炙甘草', stock: '85g', threshold: '150g' },
    { name: '白芍', stock: '60g', threshold: '200g' },
]

export default function AdminDashboard() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl font-bold text-theme-text">控制台總覽</h2>
                <p className="text-theme-text-muted text-sm mt-0.5">2026年2月23日 · 星期一</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className="card p-4 flex items-start gap-4 rounded-sm">
                        <div className={`${bg} p-2.5 rounded-sm shrink-0`}>
                            <Icon size={20} className={color} />
                        </div>
                        <div>
                            <p className="text-theme-text-muted text-xs font-medium">{label}</p>
                            <p className="text-theme-text text-xl font-bold mt-0.5">{value}</p>
                            <p className="text-stone-500 text-xs mt-0.5">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Recent activity */}
                <div className="card p-4 lg:col-span-2 rounded-sm">
                    <h3 className="text-theme-text font-semibold text-sm mb-4">最近動態</h3>
                    <div className="space-y-3">
                        {recentActivity.map(({ time, desc, type }) => (
                            <div key={time + desc} className="flex items-start gap-3">
                                <span className="text-stone-500 text-xs font-mono mt-0.5 w-10 shrink-0">{time}</span>
                                <p className="text-theme-text text-sm flex-1">{desc}</p>
                                <Badge variant={type}>{type === 'success' ? '完成' : type === 'warning' ? '警告' : type === 'info' ? '確認' : '新增'}</Badge>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low stock alert */}
                <div className="card p-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={16} className="text-theme-primary" />
                        <h3 className="text-theme-text font-semibold text-sm">庫存警報</h3>
                    </div>
                    <div className="space-y-3">
                        {lowStock.map(({ name, stock, threshold }) => (
                            <div key={name} className="flex items-center justify-between">
                                <div>
                                    <p className="text-theme-text text-sm font-medium">{name}</p>
                                    <p className="text-stone-500 text-xs">最低線：{threshold}</p>
                                </div>
                                <Badge variant="warning">{stock}</Badge>
                            </div>
                        ))}
                    </div>
                    <button className="mt-4 w-full text-xs text-theme-primary hover:text-white border border-theme-primary/50 hover:bg-theme-primary rounded-sm py-2 transition-colors">
                        查看全部庫存 →
                    </button>
                </div>
            </div>
        </div>
    )
}
