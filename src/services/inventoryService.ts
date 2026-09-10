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
import type { InventoryItem } from '../types'

const COL = 'inventory'

export const inventoryService = {
    async getByClinic(clinicId: string): Promise<InventoryItem[]> {
        const q = query(collection(db, COL), where('clinicId', '==', clinicId))
        const snap = await getDocs(q)
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem))
    },

    async getLowStock(clinicId: string): Promise<InventoryItem[]> {
        const all = await inventoryService.getByClinic(clinicId)
        return all.filter((i) => i.stockGrams <= i.reorderThreshold)
    },

    async create(
        clinicId: string,
        data: Omit<InventoryItem, 'id' | 'clinicId' | 'updatedAt'>,
    ): Promise<string> {
        const ref = await addDoc(collection(db, COL), {
            ...data,
            clinicId,
            updatedAt: serverTimestamp(),
        })
        return ref.id
    },

    async updateStock(id: string, stockGrams: number): Promise<void> {
        await updateDoc(doc(db, COL, id), {
            stockGrams,
            updatedAt: serverTimestamp(),
        })
    },
}
