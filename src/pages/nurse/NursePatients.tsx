import React, { useState } from 'react';
import {
    UserPlus, Search, Calendar, ClipboardList, ShieldAlert,
    Filter, Loader2, Pencil, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../hooks/useRealtime';
import type { Patient } from '../../types';
import PatientFormModal from './components/PatientFormModal';

export default function NursePatients() {
    const { userProfile } = useAuth();
    const clinicId = userProfile?.clinicId || '';
    const { data: patients, loading } = useRealtime<Patient>('patients', clinicId);

    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);

    const openCreate = () => {
        setEditingPatient(undefined);
        setModalOpen(true);
    };

    const openEdit = (p: Patient, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPatient(p);
        setModalOpen(true);
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.hkid?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPatients = patients.length;
    const voucherPatients = patients.filter(p => p.voucherEligible).length;
    const todayRegistrations = patients.filter(p => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt).toDateString() === new Date().toDateString();
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-theme-primary">病患庫</h1>
                    <p className="text-theme-text-muted text-sm mt-1">管理診所所有病患的病歷檔案與基本資料</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2 shadow-sm px-5">
                    <UserPlus size={18} />
                    登記新病患
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-theme-surface p-4 rounded-sm border border-theme-border flex flex-wrap gap-3 shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
                    <input
                        type="text"
                        placeholder="搜尋姓名、電話或身份證..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-secondary flex items-center gap-2 px-4 rounded-sm">
                    <Filter size={18} />
                    篩選
                </button>
            </div>

            {/* Patient Table */}
            <div className="bg-theme-surface rounded-sm border border-theme-border overflow-hidden shadow-sm min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-theme-text-muted gap-3">
                        <Loader2 className="animate-spin" size={32} />
                        <span>載入資料中...</span>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="text-center py-32 text-theme-text-muted">
                        <ClipboardList className="mx-auto mb-4 opacity-20" size={64} />
                        <p>尚無病人資料</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-theme-bg/50 border-b border-theme-border">
                                <th className="px-6 py-4 text-sm font-bold text-theme-text">病人姓名</th>
                                <th className="px-6 py-4 text-sm font-bold text-theme-text">性別 / 電話</th>
                                <th className="px-6 py-4 text-sm font-bold text-theme-text">身份證</th>
                                <th className="px-6 py-4 text-sm font-bold text-theme-text">過敏史</th>
                                <th className="px-6 py-4 text-sm font-bold text-theme-text">建立日期</th>
                                <th className="px-6 py-4 text-sm font-bold text-theme-text text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border/50">
                            {filteredPatients.map((p) => (
                                <tr key={p.id} className="hover:bg-theme-primary/5 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-sm bg-theme-primary/10 flex items-center justify-center text-theme-primary font-bold shrink-0">
                                                {p.name[0]}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-theme-text">{p.name}</span>
                                                {p.voucherEligible && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 w-fit">
                                                        <BadgeCheck size={9} />
                                                        醫療券 {p.voucherBalance !== undefined ? `HK$${p.voucherBalance}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-theme-text-muted text-sm">
                                        {p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : '其他'} / <span className="text-theme-text">{p.phone}</span>
                                    </td>
                                    <td className="px-6 py-4 text-theme-text-muted text-sm font-mono uppercase">
                                        {p.hkid || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {p.allergies && p.allergies.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {p.allergies.map((a, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs font-bold border border-red-200">
                                                        <ShieldAlert size={10} />
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-theme-text-muted text-sm">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-theme-text-muted text-sm">
                                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => openEdit(p, e)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm border border-theme-border text-theme-text-muted hover:text-theme-primary hover:border-theme-primary hover:bg-theme-primary/5 transition-all"
                                        >
                                            <Pencil size={13} />
                                            編輯
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card p-4 flex items-center gap-3 rounded-sm">
                    <div className="p-2.5 rounded-sm bg-stone-100 text-stone-600"><ClipboardList size={20} /></div>
                    <div>
                        <div className="text-xl font-bold text-theme-text">{totalPatients}</div>
                        <div className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider">總病患人數</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-3 rounded-sm">
                    <div className="p-2.5 rounded-sm bg-theme-primary/10 text-theme-primary"><Calendar size={20} /></div>
                    <div>
                        <div className="text-xl font-bold text-theme-text">{todayRegistrations}</div>
                        <div className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider">今日登記</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-3 rounded-sm">
                    <div className="p-2.5 rounded-sm bg-emerald-100 text-emerald-600"><BadgeCheck size={20} /></div>
                    <div>
                        <div className="text-xl font-bold text-theme-text">{voucherPatients}</div>
                        <div className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider">長者醫療券病患</div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <PatientFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                clinicId={clinicId}
                initialData={editingPatient}
            />
        </div>
    );
}