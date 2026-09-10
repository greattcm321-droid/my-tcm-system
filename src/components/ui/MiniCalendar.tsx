import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    parse
} from 'date-fns'
import { zhHK } from 'date-fns/locale'

interface MiniCalendarProps {
    selectedDate: string // YYYY-MM-DD
    onDateSelect: (date: string) => void
}

export default function MiniCalendar({ selectedDate, onDateSelect }: MiniCalendarProps) {
    const parsedSelectedDate = parse(selectedDate, 'yyyy-MM-dd', new Date())
    const [currentMonth, setCurrentMonth] = useState(new Date(parsedSelectedDate.getFullYear(), parsedSelectedDate.getMonth(), 1))
    
    const today = new Date()
    
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    
    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    })

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']

    return (
        <div className="bg-theme-surface border border-theme-border rounded-sm p-4 w-full select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-theme-text">
                    {format(currentMonth, 'yyyy年 MM月', { locale: zhHK })}
                </h3>
                <div className="flex gap-1">
                    <button 
                        onClick={prevMonth}
                        className="p-1 hover:bg-theme-surface-alt rounded-sm border border-transparent hover:border-theme-border transition-all"
                    >
                        <ChevronLeft size={16} className="text-theme-text-muted" />
                    </button>
                    <button 
                        onClick={nextMonth}
                        className="p-1 hover:bg-theme-surface-alt rounded-sm border border-transparent hover:border-theme-border transition-all"
                    >
                        <ChevronRight size={16} className="text-theme-text-muted" />
                    </button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-theme-text-muted py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                    const isSelected = isSameDay(day, parsedSelectedDate)
                    const isToday = isSameDay(day, today)
                    const isCurrentMonth = isSameMonth(day, monthStart)
                    const dateStr = format(day, 'yyyy-MM-dd')

                    return (
                        <button
                            key={idx}
                            onClick={() => onDateSelect(dateStr)}
                            className={`
                                relative h-8 w-full flex items-center justify-center text-xs rounded-sm transition-all
                                ${!isCurrentMonth ? 'text-theme-text-muted opacity-30' : 'text-theme-text'}
                                ${isSelected ? 'bg-theme-primary text-white font-bold' : 'hover:bg-theme-primary/10'}
                            `}
                        >
                            <span className="relative z-10">{format(day, 'd')}</span>
                            {/* Today Indicator: Thin Circle */}
                            {isToday && !isSelected && (
                                <div className="absolute inset-1 border border-theme-primary rounded-full"></div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
