import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Invoice } from '../types'

const COL = 'invoices'

export const billingService = {
    async getByClinic(clinicId: string): Promise<Invoice[]> {
        const q = query(collection(db, COL), where('clinicId', '==', clinicId))
        const snap = await getDocs(q)
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice))
    },

    async create(
        clinicId: string,
        data: Omit<Invoice, 'id' | 'clinicId' | 'createdAt'>,
    ): Promise<string> {
        const ref = await addDoc(collection(db, COL), {
            ...data,
            clinicId,
            createdAt: serverTimestamp(),
        })
        return ref.id
    },

    async updateStatus(id: string, status: Invoice['status']): Promise<void> {
        await updateDoc(doc(db, COL, id), { status })
    },
}
