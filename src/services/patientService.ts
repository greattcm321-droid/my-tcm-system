import { supabase } from '../config/supabase'
import type { Patient } from '../types'

// ─── DB Row shape (snake_case) ────────────────────────────────────────────────
interface PatientRow {
    id: string
    clinic_id: string
    name: string
    gender: 'male' | 'female' | 'other'
    dob: string                           // ISO 8601 string (YYYY-MM-DD)
    phone: string
    email?: string
    hkid?: string
    id_card_number?: string
    address?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    allergies?: string[] | null
    medical_history?: string | null
    voucher_eligible?: boolean
    voucher_balance?: number
    assigned_doctor_id?: string
    notes?: string | null
    created_at: string                    // ISO 8601 string
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/** Row (snake_case) → 前端 Patient (camelCase, ISO strings) */
function toPatient(row: PatientRow): Patient {
    let g6pd = false;
    let pregnant = false;
    if (row.notes) {
        try {
            const parsed = JSON.parse(row.notes);
            g6pd = !!parsed.g6pd;
            pregnant = !!parsed.pregnant;
        } catch (e) {
            // ignore
        }
    }

    return {
        id: row.id,
        clinicId: row.clinic_id,
        name: row.name,
        gender: row.gender,
        dob: row.dob,
        phone: row.phone,
        email: row.email,
        hkid: row.hkid,
        idCardNumber: row.id_card_number,
        address: row.address,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactPhone: row.emergency_contact_phone,
        allergies: row.allergies || [],
        // 確保前端使用 camelCase
        medical_history: row.medical_history || '',
        medicalHistory: row.medical_history || '',
        g6pd,
        pregnant,
        notes: row.notes || '',
        voucherEligible: row.voucher_eligible,
        voucherBalance: row.voucher_balance,
        assignedDoctorId: row.assigned_doctor_id,
        createdAt: row.created_at,
    }
}

/** 前端 Partial<Patient> → DB row (snake_case) */
function toRow(data: Partial<Patient> & { clinicId?: string }): Partial<PatientRow> {
    const row: Partial<PatientRow> = {}

    if (data.clinicId !== undefined) row.clinic_id = data.clinicId
    if (data.name !== undefined) row.name = data.name
    if (data.gender !== undefined) row.gender = data.gender
    if (data.dob !== undefined) row.dob = data.dob
    if (data.phone !== undefined) row.phone = data.phone
    if (data.email !== undefined) row.email = data.email
    if (data.hkid !== undefined) row.hkid = data.hkid
    if (data.idCardNumber !== undefined) row.id_card_number = data.idCardNumber
    if (data.address !== undefined) row.address = data.address
    if (data.emergencyContactName !== undefined) row.emergency_contact_name = data.emergencyContactName
    if (data.emergencyContactPhone !== undefined) row.emergency_contact_phone = data.emergencyContactPhone
    if (data.allergies !== undefined) row.allergies = data.allergies

    // 雙重對齊，避免前端傳入的命名格式錯誤
    if (data.medicalHistory !== undefined) row.medical_history = data.medicalHistory
    if (data.medical_history !== undefined) row.medical_history = data.medical_history

    if (data.voucherEligible !== undefined) row.voucher_eligible = data.voucherEligible
    if (data.voucherBalance !== undefined) row.voucher_balance = data.voucherBalance
    if (data.assignedDoctorId !== undefined) row.assigned_doctor_id = data.assignedDoctorId
    if (data.notes !== undefined) row.notes = data.notes

    return row
}

// ─── Helper：統一錯誤拋出 ─────────────────────────────────────────────────────
function assertNoError<T>(data: T | null, error: any, context: string): T {
    if (error) {
        console.error(`[patientService.${context}] error:`, error)
        throw new Error(`[patientService.${context}] ${error.message || error.details || JSON.stringify(error)}`)
    }
    if (data == null) throw new Error(`[patientService.${context}] No data returned`)
    return data
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const patientService = {

    /** 取得單一病患 */
    async getById(id: string): Promise<Patient | null> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single()

        if (error?.code === 'PGRST116') return null
        assertNoError(data, error, 'getById')
        return toPatient(data as PatientRow)
    },

    /** 取得某診所的所有病患 */
    async getByClinic(clinicId: string): Promise<Patient[]> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        assertNoError(data, error, 'getByClinic')
        return (data as PatientRow[]).map(toPatient)
    },

    /** 模糊搜尋病患 (支援姓名、電話、身份證字號) */
    async search(clinicId: string, queryStr: string): Promise<Patient[]> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId)
            .or(`name.ilike.%${queryStr}%,phone.ilike.%${queryStr}%,hkid.ilike.%${queryStr}%,id_card_number.ilike.%${queryStr}%`)
            .order('name', { ascending: true })

        assertNoError(data, error, 'search')
        return (data as PatientRow[]).map(toPatient)
    },

    /** * 建立新病患 
     * 🔥 加上雙重保險：強制寫入 clinic_id 以突破 RLS 權限鎖，並補上 created_at
     */
    async create(
        clinicId: string,
        data: Partial<Patient>,
    ): Promise<string> {
        const row = toRow({ ...data, clinicId })

        // 確保關鍵安全欄位絕對存在
        const finalRow = {
            ...row,
            clinic_id: clinicId,
            created_at: new Date().toISOString()
        }

        const { data: inserted, error } = await supabase
            .from('patients')
            .insert([finalRow])
            .select('id')
            .single()

        assertNoError(inserted, error, 'create')
        return (inserted as { id: string }).id
    },

    /** 更新病患資料 */
    async update(id: string, data: Partial<Patient>): Promise<void> {
        let notesValue = data.notes;
        if (data.g6pd !== undefined || data.pregnant !== undefined) {
            const existing = await this.getById(id);
            const currentNotes = existing?.notes || '';
            let parsed: any = {};
            try {
                parsed = JSON.parse(currentNotes || '{}');
            } catch (e) {}
            if (data.g6pd !== undefined) parsed.g6pd = data.g6pd;
            if (data.pregnant !== undefined) parsed.pregnant = data.pregnant;
            notesValue = JSON.stringify(parsed);
        }

        const row = toRow({ ...data, ...(notesValue !== undefined ? { notes: notesValue } : {}) });
        const { error } = await supabase
            .from('patients')
            .update(row)
            .eq('id', id)

        if (error) throw new Error(`[patientService.update] ${error.message}`)
    },
}