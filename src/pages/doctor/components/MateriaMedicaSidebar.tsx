import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface MateriaMedicaSidebarProps {
    onAddHerb: (herbName: string) => void;
}

const MateriaMedicaSidebar: React.FC<MateriaMedicaSidebarProps> = ({ onAddHerb }) => {
    const [activeTab, setActiveTab] = useState('中藥庫');
    const [expandedSections, setExpandedSections] = useState<string[]>(['氣', '味']);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

    const categories = [
        { name: '氣', tags: ['寒', '熱', '温', '涼', '平'] },
        { name: '味', tags: ['澀', '淡', '酸', '苦', '甘', '辛', '咸', '毒', '無毒'] },
        { name: '升降', tags: ['升', '降', '浮', '沉'] },
        { name: '歸經', tags: ['沖', '任', '督', '帶', '肝', '心', '脾', '肺', '腎', '心包', '膽', '小腸', '胃', '大腸', '膀胱', '三焦'] },
        { name: '氣血', tags: ['衛', '氣', '營', '血', '血中氣藥', '氣中血藥'] },
        { name: '引經', tags: ['沖', '任', '督', '帶', '肝', '心', '脾', '肺', '腎', '心包', '膽', '小腸', '胃', '大腸', '膀胱', '三焦'] }
    ];

    const mockHerbs = ['黃連', '黃芩', '黃柏', '大黃', '梔子', '石膏', '知母'];

    return (
        <div className="flex flex-col h-full w-full" style={{ background: 'var(--surface)' }}>
            {/* 頂部搜尋與 Tab */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5" size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="搜尋病徵、方劑、條文..."
                        className="input-field pl-10"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['中藥庫', '黃帝內經', '醫學三字經', '溫病條辨', '傷寒論', '本草從新'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border`}
                            style={activeTab === tab ? {
                                background: 'var(--primary-muted)',
                                color: 'var(--primary)',
                                borderColor: 'var(--primary)',
                            } : {
                                background: 'var(--surface-alt)',
                                color: 'var(--text-muted)',
                                borderColor: 'var(--border)',
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* 內容區 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {activeTab === '中藥庫' ? (
                    <>
                        {/* 分類過濾器 */}
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.name} className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                                    <button
                                        onClick={() => toggleSection(cat.name)}
                                        className="w-full flex items-center justify-between p-2 transition-colors"
                                        style={{ background: 'var(--surface-alt)' }}
                                    >
                                        <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{cat.name}</span>
                                        {expandedSections.includes(cat.name)
                                            ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                                            : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                                    </button>
                                    {expandedSections.includes(cat.name) && (
                                        <div className="p-2 flex flex-wrap gap-1.5" style={{ background: 'var(--surface)' }}>
                                            {cat.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 text-[10px] rounded cursor-pointer transition-colors"
                                                    style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                                                    onMouseEnter={e => {
                                                        (e.target as HTMLElement).style.background = 'var(--primary-muted)'
                                                            ; (e.target as HTMLElement).style.color = 'var(--primary)'
                                                    }}
                                                    onMouseLeave={e => {
                                                        (e.target as HTMLElement).style.background = 'var(--surface-alt)'
                                                            ; (e.target as HTMLElement).style.color = 'var(--text-muted)'
                                                    }}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 藥材清單 */}
                        <div className="pt-4">
                            <h4 className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--text-muted)' }}>搜尋結果</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {mockHerbs.map(herb => (
                                    <button
                                        key={herb}
                                        onClick={() => onAddHerb(herb)}
                                        className="flex flex-col p-2 rounded transition-all text-left group"
                                        style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                                        }}
                                    >
                                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{herb}</span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>苦, 寒 | 心、肝經</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10" style={{ color: 'var(--text-muted)' }}>
                        <BookOpen size={32} className="mb-2 opacity-20" />
                        <p className="text-xs italic">{activeTab} 內容載入中...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MateriaMedicaSidebar;