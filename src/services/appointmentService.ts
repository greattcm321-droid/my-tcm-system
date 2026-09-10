import { supabase } from '../config/supabase'
import type { Appointment, PaymentDetails } from '../types'

// ─── DB Row shape (snake_case) ────────────────────────────────────────────────
interface AppointmentRow {
    id: string
    clinic_id: string
    patient_id: string
    patient_name?: string
    doctor_id: string
    nurse_id?: string
    scheduled_at: string          // timestamptz → ISO 8601 string
    duration: number
    status: Appointment['status']
    dispense_status?: 'pending' | 'ready'
    payment_status?: 'pending' | 'paid'
    payment_details?: Record<string, any>
    type: Appointment['type']
    notes?: string
    external_booking_id?: string
    source: Appointment['source']
    date_str: string
    created_at: string
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/** Row (snake_case) → 前端 Appointment (camelCase, ISO strings) */
function toAppointment(row: AppointmentRow): Appointment {
    return {
        id:                row.id,
        clinicId:          row.clinic_id,
        patientId:         row.patient_id,
        patientName:       row.patient_name,
        doctorId:          row.doctor_id,
        nurseId:           row.nurse_id,
        scheduledAt:       row.scheduled_at,
        duration:          row.duration,
        status:            row.status,
        dispenseStatus:    row.dispense_status,
        paymentStatus:     row.payment_status,
        paymentDetails:    row.payment_details as PaymentDetails | undefined,
        type:              row.type,
        notes:             row.notes,
        externalBookingId: row.external_booking_id,
        source:            row.source,
        dateStr:           row.date_str,
        createdAt:         row.created_at,
    }
}

/** 前端 Partial<Appointment> → DB row (snake_case)
 *  只輸出非 undefined 的欄位，安全用於 insert / update。
 *  scheduledAt 已是 ISO string，直接寫入，不再需要 .toDate() 轉換。 */
function toRow(data: Partial<Appointment> & { clinicId?: string }): Partial<AppointmentRow> {
    const row: Partial<AppointmentRow> = {}

    if (data.clinicId          !== undefined) row.clinic_id           = data.clinicId
    if (data.patientId         !== undefined) row.patient_id          = data.patientId
    if (data.patientName       !== undefined) row.patient_name        = data.patientName
    if (data.doctorId          !== undefined) row.doctor_id           = data.doctorId
    if (data.nurseId           !== undefined) row.nurse_id            = data.nurseId
    if (data.scheduledAt       !== undefined) row.scheduled_at        = data.scheduledAt  // already ISO string
    if (data.duration          !== undefined) row.duration            = data.duration
    if (data.status            !== undefined) row.status              = data.status
    if (data.dispenseStatus    !== undefined) row.dispense_status     = data.dispenseStatus
    if (data.paymentStatus     !== undefined) row.payment_status      = data.paymentStatus
    
    // 雙向映射與 Pass-through：支援 camelCase 也支援直接傳 snake_case
    if (data.paymentDetails    !== undefined) row.payment_details     = data.paymentDetails as any
    if ('payment_details' in data)            row.payment_details     = (data as any).payment_details

    // 針對狀態也加上直通支持，確保不漏任何繞過 TypeScript 的呼叫
    if ('payment_status' in data)             row.payment_status      = (data as any).payment_status
    if ('dispense_status' in data)            row.dispense_status     = (data as any).dispense_status

    if (data.type              !== undefined) row.type                = data.type
    if (data.notes             !== undefined) row.notes               = data.notes
    if (data.externalBookingId !== undefined) row.external_booking_id = data.externalBookingId
    if (data.source            !== undefined) row.source              = data.source
    if (data.dateStr           !== undefined) row.date_str            = data.dateStr

    return row
}

// ─── Helper：統一錯誤拋出 ─────────────────────────────────────────────────────
function assertNoError<T>(data: T | null, error: any, context: string): T {
    if (error) throw new Error(`[appointmentService.${context}] ${error.message}`)
    if (data == null) throw new Error(`[appointmentService.${context}] No data returned`)
    return data
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const appointmentService = {

    /** 取得單一預約 */
    async getById(id: string): Promise<Appointment | null> {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single()

        if (error?.code === 'PGRST116') return null
        assertNoError(data, error, 'getById')
        return toAppointment(data as AppointmentRow)
    },

    /** 取得某診所的所有預約 */
    async getByClinic(clinicId: string): Promise<Appointment[]> {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('scheduled_at', { ascending: false })

        assertNoError(data, error, 'getByClinic')
        return (data as AppointmentRow[]).map(toAppointment)
    },

    /** 取得某診所指定日期的預約 (timezone-safe via date_str) */
    async getByDate(clinicId: string, dateStr: string): Promise<Appointment[]> {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('date_str', dateStr)
            .order('scheduled_at', { ascending: true })

        assertNoError(data, error, 'getByDate')
        return (data as AppointmentRow[]).map(toAppointment)
    },

    /** 取得某醫師的預約 */
    async getByDoctor(clinicId: string, doctorId: string): Promise<Appointment[]> {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('doctor_id', doctorId)
            .order('scheduled_at', { ascending: false })

        assertNoError(data, error, 'getByDoctor')
        return (data as AppointmentRow[]).map(toAppointment)
    },

    /** 建立預約 */
    async create(
        clinicId: string,
        data: Omit<Appointment, 'id' | 'clinicId' | 'createdAt'>,
    ): Promise<string> {
        const row = toRow({ ...data, clinicId })

        // 強制注入 clinic_id 與 created_at，確保 RLS Policy 能正確比對
        const finalRow = {
            ...row,
            clinic_id: clinicId,
            created_at: new Date().toISOString(),
        }

        const { data: inserted, error } = await supabase
            .from('appointments')
            .insert([finalRow])
            .select('id')
            .single()

        assertNoError(inserted, error, 'create')
        return (inserted as { id: string }).id
    },

    /** 更新預約狀態 */
    async updateStatus(id: string, status: Appointment['status']): Promise<void> {
        const { error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id)

        if (error) throw new Error(`[appointmentService.updateStatus] ${error.message}`)
    },

    /** 更新預約任意欄位 */
    async update(id: string, data: Partial<Appointment>): Promise<void> {
        const row = toRow(data)
        const { error } = await supabase
            .from('appointments')
            .update(row)
            .eq('id', id)

        if (error) throw new Error(`[appointmentService.update] ${error.message}`)
    },
}
