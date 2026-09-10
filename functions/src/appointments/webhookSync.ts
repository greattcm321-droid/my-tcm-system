import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

/**
 * webhookSync — 外部預約平台同步端點
 *
 * 接收外部預約平台 (e.g. Calendly, Booksy) 的 webhook，
 * 將預約寫入 Firestore，source 標記為 'external'。
 *
 * TODO: 實作驗證 (HMAC signature)、診所 clinicId 映射邏輯
 */
export const webhookSync = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed')
        return
    }

    try {
        const payload = req.body as {
            clinicId: string
            externalBookingId: string
            patientName: string
            patientPhone: string
            doctorId: string
            scheduledAt: string // ISO 8601
            type?: 'initial' | 'followup' | 'urgent'
        }

        // TODO: 驗證 payload clinicId 對應的診所確實存在且啟用
        // TODO: 查找或建立病人記錄 (patientService)

        const db = admin.firestore()
        await db.collection('appointments').add({
            clinicId: payload.clinicId,
            externalBookingId: payload.externalBookingId,
            doctorId: payload.doctorId,
            patientId: `PENDING_${payload.patientPhone}`, // 待護士確認後關聯
            scheduledAt: admin.firestore.Timestamp.fromDate(
                new Date(payload.scheduledAt),
            ),
            duration: 30,
            status: 'pending',
            type: payload.type ?? 'initial',
            source: 'external',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        res.status(200).json({ success: true })
    } catch (err) {
        console.error('webhookSync error:', err)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})
