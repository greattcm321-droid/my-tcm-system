import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * 泛型 Firestore CRUD hook。
 * 所有寫入操作強制注入 clinicId，確保租戶隔離。
 */
export function useFirestore<T extends DocumentData>(
    collectionName: string,
    clinicId: string,
) {
    const col = collection(db, collectionName)

    /** 查詢 (自動附加 clinicId 過濾) */
    const fetchAll = async (extraConstraints: QueryConstraint[] = []) => {
        const q = query(col, where('clinicId', '==', clinicId), ...extraConstraints)
        const snap = await getDocs(q)
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))
    }

    /** 新增 (強制注入 clinicId + createdAt) */
    const create = async (data: Omit<T, 'id' | 'clinicId' | 'createdAt'>) => {
        const ref = await addDoc(col, {
            ...data,
            clinicId,
            createdAt: serverTimestamp(),
        })
        return ref.id
    }

    /** 更新 */
    const update = async (id: string, data: Partial<T>) => {
        await updateDoc(doc(db, collectionName, id), data as DocumentData)
    }

    /** 刪除 */
    const remove = async (id: string) => {
        await deleteDoc(doc(db, collectionName, id))
    }

    return { fetchAll, create, update, remove }
}
