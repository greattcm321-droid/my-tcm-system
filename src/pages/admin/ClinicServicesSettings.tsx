import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Check, X, Sliders, DollarSign, Tag, Layers } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clinicServiceService } from '../../services/clinicServiceService';
import type { ClinicService, ServiceCategory } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CATEGORY_LABELS: Record<ServiceCategory, { label: string; color: string; bg: string }> = {
    consultation: { label: '診金', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    herbs:        { label: '藥費', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    acupuncture:  { label: '針灸', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
    tuina:        { label: '推拿', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
    bone_setting: { label: '正骨', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    traumatology: { label: '跌打', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
    other:        { label: '其他', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
};

export default function ClinicServicesSettings() {
    const { userProfile } = useAuth();
    const clinicId = userProfile?.clinicId || '';

    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<ClinicService[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<string>('all');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ClinicService | null>(null);
    const [formError, setFormError] = useState('');
    
    // Form fields
    const [name, setName] = useState('');
    const [category, setCategory] = useState<ServiceCategory>('consultation');
    const [defaultPrice, setDefaultPrice] = useState(0);
    const [unit, setUnit] = useState('次');
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);

    const fetchServices = async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const data = await clinicServiceService.getAll(clinicId);
            setServices(data);
        } catch (err) {
            console.error("Failed to load clinic services:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, [clinicId]);

    const openCreateModal = () => {
        setEditingService(null);
        setName('');
        setCategory('consultation');
        setDefaultPrice(0);
        setUnit('次');
        setIsActive(true);
        setSortOrder(0);
        setFormError('');
        setIsModalOpen(true);
    };

    const openEditModal = (service: ClinicService) => {
        setEditingService(service);
        setName(service.name);
        setCategory(service.category);
        setDefaultPrice(service.defaultPrice);
        setUnit(service.unit);
        setIsActive(service.isActive);
        setSortOrder(service.sortOrder || 0);
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setFormError('請輸入項目名稱');
            return;
        }
        if (defaultPrice < 0) {
            setFormError('價格不能為負數');
            return;
        }

        try {
            if (editingService?.id) {
                // Update
                await clinicServiceService.update(editingService.id, {
                    name: name.trim(),
                    category,
                    defaultPrice,
                    unit: unit.trim(),
                    isActive,
                    sortOrder,
                });
            } else {
                // Create
                await clinicServiceService.create(clinicId, {
                    name: name.trim(),
                    category,
                    defaultPrice,
                    unit: unit.trim(),
                    isActive,
                    sortOrder,
                });
            }
            setIsModalOpen(false);
            fetchServices();
        } catch (err: any) {
            setFormError(err.message || '儲存失敗，請重試');
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await clinicServiceService.toggleActive(id, !currentStatus);
            setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !currentStatus } : s));
        } catch (err) {
            console.error("Failed to toggle service status:", err);
            alert("狀態修改失敗，請確認權限。");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("確定要刪除此服務項目？這不會影響已經結帳的歷史報表，但未來開單將無法選擇。")) {
            return;
        }
        try {
            await clinicServiceService.delete(id);
            setServices(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Failed to delete service:", err);
            alert("刪除失敗，請重試。");
        }
    };

    // Filter & Search Logic
    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             CATEGORY_LABELS[service.category].label.includes(searchQuery);
        const matchesTab = selectedTab === 'all' || service.category === selectedTab;
        return matchesSearch && matchesTab;
    });

    return (
        <div className="p-8 min-h-screen bg-theme-bg text-theme-text animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-theme-primary flex items-center gap-2">
                        <Sliders className="w-6 h-6" /> 服務項目與定價設定
                    </h1>
                    <p className="text-xs font-semibold text-theme-text-muted mt-1">
                        維護診所掛號診金、藥費及各類中醫特色治療項目的預設價格與單位。
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-theme-primary hover:bg-theme-primary/95 rounded-sm shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" /> 新增收費項目
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-theme-surface border border-theme-border rounded-sm p-4 mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                    <button
                        onClick={() => setSelectedTab('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${selectedTab === 'all' ? 'bg-theme-primary/10 text-theme-primary border-theme-primary/20' : 'bg-transparent border-transparent text-theme-text-muted hover:text-theme-text hover:bg-theme-bg'}`}
                    >
                        全部項目
                    </button>
                    {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
                        <button
                            key={catKey}
                            onClick={() => setSelectedTab(catKey)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-all ${selectedTab === catKey ? 'bg-theme-primary/10 text-theme-primary border-theme-primary/20' : 'bg-transparent border-transparent text-theme-text-muted hover:text-theme-text hover:bg-theme-bg'}`}
                        >
                            {val.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-theme-text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="搜尋服務項目名稱..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-theme-bg border border-theme-border rounded-sm focus:border-theme-primary outline-none font-bold"
                    />
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <LoadingSpinner />
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="bg-theme-surface border border-theme-border rounded-sm p-16 text-center shadow-sm">
                    <Layers className="w-12 h-12 mx-auto text-theme-text-muted opacity-30 mb-3" />
                    <p className="font-bold text-sm text-theme-text-muted">尚無符合條件的服務定價項目</p>
                    <p className="text-xs text-theme-text-muted/70 mt-1">請嘗試變更搜尋關鍵字或點擊右上角新增項目。</p>
                </div>
            ) : (
                <div className="bg-theme-surface border border-theme-border rounded-sm shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-theme-bg border-b border-theme-border text-theme-text-muted text-xs font-black uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5 w-20">排序</th>
                                    <th className="px-6 py-3.5">項目名稱</th>
                                    <th className="px-6 py-3.5">分類</th>
                                    <th className="px-6 py-3.5 text-right">預設單價 (HKD)</th>
                                    <th className="px-6 py-3.5">計價單位</th>
                                    <th className="px-6 py-3.5 w-24 text-center">狀態</th>
                                    <th className="px-6 py-3.5 w-24 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-border">
                                {filteredServices.map(service => {
                                    const catInfo = CATEGORY_LABELS[service.category] || CATEGORY_LABELS.other;
                                    return (
                                        <tr key={service.id} className="hover:bg-theme-bg/30 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-theme-text-muted">
                                                {service.sortOrder ?? 0}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-theme-text">
                                                {service.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 text-xs font-extrabold rounded-sm border ${catInfo.bg} ${catInfo.color}`}>
                                                    {catInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-theme-primary">
                                                ${(service.defaultPrice || 0).toFixed(1)}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-theme-text-muted">
                                                / {service.unit}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(service.id!, service.isActive)}
                                                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${service.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-stone-500/10 text-stone-500 border-stone-500/20'}`}
                                                >
                                                    {service.isActive ? '已啟用' : '已停用'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => openEditModal(service)}
                                                    className="p-1 hover:text-theme-primary transition-colors inline-block"
                                                    title="編輯"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(service.id!)}
                                                    className="p-1 hover:text-red-600 transition-colors inline-block"
                                                    title="刪除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-theme-surface border border-theme-border rounded-sm shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden">
                        <div className="px-6 py-4 bg-theme-bg/60 border-b border-theme-border flex justify-between items-center">
                            <h3 className="font-black text-theme-text text-base flex items-center gap-1.5">
                                <Tag className="w-4 h-4 text-theme-primary" />
                                {editingService ? '修改服務項目' : '新增服務項目'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-theme-text-muted hover:text-theme-text p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-sm border border-red-200">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-theme-text-muted uppercase tracking-wider mb-1.5">
                                    項目名稱
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="例如：初診診金、八品中藥、遠紅外線針灸..."
                                    className="w-full bg-theme-bg border border-theme-border rounded-sm px-3 py-2 text-sm font-bold focus:border-theme-primary outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-theme-text-muted uppercase tracking-wider mb-1.5">
                                        分類
                                    </label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value as ServiceCategory)}
                                        className="w-full bg-theme-bg border border-theme-border rounded-sm px-3 py-2 text-sm font-bold focus:border-theme-primary outline-none cursor-pointer"
                                    >
                                        {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
                                            <option key={catKey} value={catKey}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-theme-text-muted uppercase tracking-wider mb-1.5">
                                        預設單位
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={unit}
                                        onChange={e => setUnit(e.target.value)}
                                        placeholder="次、天、帖、部位"
                                        className="w-full bg-theme-bg border border-theme-border rounded-sm px-3 py-2 text-sm font-bold focus:border-theme-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-theme-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-0.5">
                                        <DollarSign className="w-3 h-3" /> 預設單價 (HKD)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.5"
                                        value={defaultPrice}
                                        onChange={e => setDefaultPrice(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-theme-bg border border-theme-border rounded-sm px-3 py-2 text-sm font-mono font-bold focus:border-theme-primary outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-theme-text-muted uppercase tracking-wider mb-1.5">
                                        排序權重
                                    </label>
                                    <input
                                        type="number"
                                        value={sortOrder}
                                        onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                                        className="w-full bg-theme-bg border border-theme-border rounded-sm px-3 py-2 text-sm font-mono font-bold focus:border-theme-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center">
                                <input
                                    type="checkbox"
                                    id="is-active-checkbox"
                                    checked={isActive}
                                    onChange={e => setIsActive(e.target.checked)}
                                    className="w-4 h-4 text-theme-primary border-theme-border rounded-xs focus:ring-theme-primary focus:ring-1 focus:ring-offset-0 cursor-pointer"
                                />
                                <label htmlFor="is-active-checkbox" className="ml-2 text-xs font-bold text-theme-text cursor-pointer select-none">
                                    啟用此項目 (開單選單可見)
                                </label>
                            </div>

                            <div className="pt-4 border-t border-theme-border flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold bg-theme-bg border border-theme-border rounded-sm hover:bg-theme-bg/60 transition-colors text-theme-text"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold bg-theme-primary hover:bg-theme-primary/95 text-white rounded-sm transition-colors flex items-center gap-1"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    確定儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
