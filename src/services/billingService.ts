import { supabase } from '../config/supabase'
import type { Invoice } from '../types'

const COL = 'invoices'

// ─── DB Row shape (snake_case) ────────────────────────────────────────────────
interface InvoiceRow {
    id: string
    clinic_id: string
    appointment_id?: string
    patient_id?: string
    patient_name?: string
    status: Invoice['status']
    total_amount: number
    payment_details?: Record<string, any>
    created_at: string
}

function toInvoice(row: InvoiceRow): Invoice {
    return {
        id: row.id,
        clinicId: row.clinic_id,
        patientId: row.patient_id ?? '',
        consultationId: row.appointment_id ?? '',
        items: [],
        subtotal: row.total_amount,
        total: row.total_amount,
        status: row.status,
        createdAt: row.created_at,
    }
}

export const billingService = {
    async getByClinic(clinicId: string): Promise<Invoice[]> {
        const { data, error } = await supabase
            .from(COL)
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return (data || []).map((row: any) => toInvoice(row as InvoiceRow))
    },

    async create(
        clinicId: string,
        data: Omit<Invoice, 'id' | 'clinicId' | 'createdAt'>,
    ): Promise<string> {
        const { data: result, error } = await supabase
            .from(COL)
            .insert({
                clinic_id: clinicId,
                ...data,
                created_at: new Date().toISOString(),
            })
            .select('id')
            .single()
        if (error) throw error
        return result.id
    },

    async updateStatus(id: string, status: Invoice['status']): Promise<void> {
        const { error } = await supabase
            .from(COL)
            .update({ status })
            .eq('id', id)
        if (error) throw error
    },
}
