import { supabase } from '../config/supabase'
import type { InventoryItem } from '../types'

const COL = 'inventory'

// ─── DB Row shape (snake_case) ────────────────────────────────────────────────
interface InventoryRow {
    id: string
    clinic_id: string
    name: string
    category: string
    stock_grams: number
    unit_price: number
    reorder_threshold: number
    supplier?: string
    updated_at: string
}

function toInventoryItem(row: InventoryRow): InventoryItem {
    return {
        id: row.id,
        clinicId: row.clinic_id,
        name: row.name,
        category: row.category,
        stockGrams: row.stock_grams,
        unitPrice: row.unit_price,
        reorderThreshold: row.reorder_threshold,
        supplier: row.supplier,
        updatedAt: row.updated_at,
    }
}

export const inventoryService = {
    async getByClinic(clinicId: string): Promise<InventoryItem[]> {
        const { data, error } = await supabase
            .from(COL)
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name', { ascending: true })
        if (error) throw error
        return (data || []).map((row: any) => toInventoryItem(row as InventoryRow))
    },

    async getLowStock(clinicId: string): Promise<InventoryItem[]> {
        const all = await inventoryService.getByClinic(clinicId)
        return all.filter((i) => i.stockGrams <= i.reorderThreshold)
    },

    async create(
        clinicId: string,
        data: Omit<InventoryItem, 'id' | 'clinicId' | 'updatedAt'>,
    ): Promise<string> {
        const { data: result, error } = await supabase
            .from(COL)
            .insert({
                clinic_id: clinicId,
                name: data.name,
                category: data.category,
                stock_grams: data.stockGrams,
                unit_price: data.unitPrice,
                reorder_threshold: data.reorderThreshold,
                supplier: data.supplier,
                updated_at: new Date().toISOString(),
            })
            .select('id')
            .single()
        if (error) throw error
        return result.id
    },

    async updateStock(id: string, stockGrams: number): Promise<void> {
        const { error } = await supabase
            .from(COL)
            .update({ stock_grams: stockGrams, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) throw error
    },
}
