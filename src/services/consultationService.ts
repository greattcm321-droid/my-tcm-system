import { supabase } from '../config/supabase'
import type { Consultation } from '../types'

// ─── DB Row shape (snake_case) ────────────────────────────────────────────────
interface ConsultationRow {
    id: string
    clinic_id: string
    appointment_id: string
    patient_id: string
    doctor_id: string
    clinical_notes: Record<string, any>
    prescription: Record<string, any>
    acupuncture: any[]
    other_treatments?: string
    billing: any[]
    status: 'completed' | 'draft'
    created_at: string
    updated_at?: string
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toConsultation(row: ConsultationRow): Consultation {
    return {
        id:              row.id,
        clinicId:        row.clinic_id,
        appointmentId:   row.appointment_id,
        patientId:       row.patient_id,
        doctorId:        row.doctor_id,
        clinicalNotes:   row.clinical_notes as Consultation['clinicalNotes'],
        prescription:    row.prescription as Consultation['prescription'],
        acupuncture:     row.acupuncture as Consultation['acupuncture'],
        otherTreatments: row.other_treatments,
        billing:         row.billing as Consultation['billing'],
        status:          row.status,
        createdAt:       row.created_at,
        updatedAt:       row.updated_at,
    }
}

function toRow(
    clinicId: string,
    data: Omit<Consultation, 'id' | 'clinicId' | 'createdAt'>,
): Omit<ConsultationRow, 'id' | 'created_at'> {
    return {
        clinic_id:        clinicId,
        appointment_id:   data.appointmentId,
        patient_id:       data.patientId,
        doctor_id:        data.doctorId,
        clinical_notes:   data.clinicalNotes,
        prescription:     data.prescription,
        acupuncture:      data.acupuncture ?? [],
        other_treatments: data.otherTreatments ?? '',
        billing:          data.billing ?? [],
        // Force status to exactly match the DB check constraint IN ('draft', 'completed')
        status:           data.status === 'completed' ? 'completed' : 'draft',
        updated_at:       new Date().toISOString(),
    }
}

// ─── Helper：統一錯誤拋出 ─────────────────────────────────────────────────────
function assertNoError<T>(data: T | null, error: any, context: string): T {
    if (error) throw new Error(`[consultationService.${context}] ${error.message}`)
    if (data == null) throw new Error(`[consultationService.${context}] No data returned`)
    return data
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const consultationService = {

    /**
     * 儲存病歷紀錄 (Upsert)
     * 以 appointment_id 作為衝突解決鍵，反覆暫存同一筆草稿不會產生重複列。
     * DB trigger 會自動更新 updated_at，created_at 則由 DB default 處理。
     */
    async save(
        clinicId: string,
        data: Omit<Consultation, 'id' | 'clinicId' | 'createdAt'>,
    ): Promise<string> {
        const row = toRow(clinicId, data);

        const { data: savedData, error } = await supabase
            .from('consultations')
            // Use true upsert relying on the unique appointment_id constraint
            .upsert(row, { onConflict: 'appointment_id' })
            .select('id')
            .single();

        assertNoError(savedData, error, 'save (upsert)');
        return (savedData as { id: string }).id;
    },

    /**
     * 取得病人的歷史病歷 (調閱往績)
     * 只回傳 status = 'completed' 的記錄，按 created_at 降序排列。
     */
    async getPatientHistory(
        clinicId: string,
        patientId: string,
        maxResults = 20,
    ): Promise<Consultation[]> {
        const { data, error } = await supabase
            .from('consultations')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('patient_id', patientId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(maxResults)

        assertNoError(data, error, 'getPatientHistory')
        return (data as ConsultationRow[]).map(toConsultation)
    },

    /**
     * 取得某次看診的詳細資料 (草稿或已完成)
     * 用於載入工作區時復原先前暫存的草稿。
     */
    async getByAppointment(appointmentId: string): Promise<Consultation | null> {
        const { data, error } = await supabase
            .from('consultations')
            .select('*')
            .eq('appointment_id', appointmentId)
            .maybeSingle()

        if (error) throw new Error(`[consultationService.getByAppointment] ${error.message}`)
        if (!data) return null
        return toConsultation(data as ConsultationRow)
    },
}