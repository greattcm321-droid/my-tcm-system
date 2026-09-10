import { supabase } from '../config/supabase';
import type { ClinicService, ServiceCategory } from '../types';

// ─── DB Row shape (snake_case) ────────────────────────────────────────────────
interface ClinicServiceRow {
    id: string;
    clinic_id: string;
    name: string;
    category: ServiceCategory;
    default_price: number;
    unit: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

function toClinicService(row: ClinicServiceRow): ClinicService {
    return {
        id:           row.id,
        clinicId:     row.clinic_id,
        name:         row.name,
        category:     row.category,
        defaultPrice: row.default_price,
        unit:         row.unit,
        isActive:     row.is_active,
        sortOrder:    row.sort_order,
        createdAt:    row.created_at,
    };
}

function toRow(data: Partial<ClinicService>): Partial<ClinicServiceRow> {
    const row: Partial<ClinicServiceRow> = {};
    if (data.clinicId     !== undefined) row.clinic_id     = data.clinicId;
    if (data.name         !== undefined) row.name          = data.name;
    if (data.category     !== undefined) row.category      = data.category;
    if (data.defaultPrice !== undefined) row.default_price = data.defaultPrice;
    if (data.unit         !== undefined) row.unit          = data.unit;
    if (data.isActive     !== undefined) row.is_active     = data.isActive;
    if (data.sortOrder    !== undefined) row.sort_order    = data.sortOrder;
    return row;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const clinicServiceService = {

    async getActive(clinicId: string): Promise<ClinicService[]> {
        const { data, error } = await supabase
            .from('clinic_services')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw new Error(`[clinicServiceService.getActive] ${error.message}`);
        return (data as ClinicServiceRow[]).map(toClinicService);
    },

    async getAll(clinicId: string): Promise<ClinicService[]> {
        const { data, error } = await supabase
            .from('clinic_services')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('sort_order', { ascending: true });

        if (error) throw new Error(`[clinicServiceService.getAll] ${error.message}`);
        return (data as ClinicServiceRow[]).map(toClinicService);
    },

    async create(clinicId: string, data: Omit<ClinicService, 'id' | 'clinicId' | 'createdAt'>): Promise<string> {
        const row = toRow({ ...data, clinicId });
        const { data: inserted, error } = await supabase
            .from('clinic_services')
            .insert([{ ...row, created_at: new Date().toISOString() }])
            .select('id')
            .single();

        if (error) throw new Error(`[clinicServiceService.create] ${error.message}`);
        return (inserted as { id: string }).id;
    },

    async update(id: string, data: Partial<ClinicService>): Promise<void> {
        const row = toRow(data);
        const { error } = await supabase
            .from('clinic_services')
            .update(row)
            .eq('id', id);

        if (error) throw new Error(`[clinicServiceService.update] ${error.message}`);
    },

    async toggleActive(id: string, isActive: boolean): Promise<void> {
        const { error } = await supabase
            .from('clinic_services')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) throw new Error(`[clinicServiceService.toggleActive] ${error.message}`);
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('clinic_services')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`[clinicServiceService.delete] ${error.message}`);
    },
};
