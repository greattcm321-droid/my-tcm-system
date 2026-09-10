// ─── Roles ────────────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'nurse'

// ─── Tenant / Clinic ──────────────────────────────────────────────────────────
export interface Clinic {
    id: string
    name: string
    address?: string
    phone?: string
    logoUrl?: string
    themeKey?: string
    plan: 'trial' | 'basic' | 'pro' | 'enterprise'
    isActive: boolean
    createdAt: string // ISO 8601
    ownerId: string
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
    id: string
    clinicId: string
    email: string
    displayName: string
    role: UserRole
    avatarUrl?: string
    specialization?: string
    bookmarks: string[]
    createdAt: string // ISO 8601
}

// ─── Patient ──────────────────────────────────────────────────────────────────
export interface Patient {
    id?: string
    clinicId: string
    name: string
    gender: 'male' | 'female' | 'other'
    dob: string                           // ISO 8601 date string (YYYY-MM-DD)
    phone: string
    email?: string
    hkid?: string
    idCardNumber?: string                 // 身份證/護照號碼 (通用)
    address?: string
    // 緊急聯絡人
    emergencyContactName?: string
    emergencyContactPhone?: string
    // 醫療記錄
    allergies: string[]
    medical_history: string
    medicalHistory?: string
    g6pd?: boolean
    pregnant?: boolean
    notes?: string
    // 醫療券 (長者醫療券)
    voucherEligible?: boolean
    voucherBalance?: number               // 目前可用餘額 (HKD)
    // 系統
    assignedDoctorId?: string
    createdAt: string                     // ISO 8601
}

// ─── Service Category Enum ───────────────────────────────────────────────────
export type ServiceCategory =
    | 'consultation'
    | 'herbs'
    | 'acupuncture'
    | 'tuina'
    | 'bone_setting'
    | 'traumatology'
    | 'other'

// ─── Payment ──────────────────────────────────────────────────────────────────
export interface BillingLineItem {
    name: string
    category: ServiceCategory
    price: number           // 單價
    qty: number             // 數量（中藥 = 天數）
    subtotal: number        // price * qty，方便報表直接用
    unit: string            // '次' | '天' | '帖' 等
}

export interface PaymentDetails {
    method: 'cash' | 'octopus' | 'credit' | 'voucher' | 'mixed'
    totalAmount: number
    cashAmount?: number
    voucherClaimAmount?: number           // 醫療券扣除金額
    voucherTransactionNo?: string         // 醫健通交易編號 (強制填寫)
    voucherDocumentUrl?: string           // 紙本同意書上傳後的 Storage URL
    paidAt?: string                       // ISO 8601
    items?: BillingLineItem[]             // 收費細項（v2 帶 category + subtotal）
}

// ─── Appointment ──────────────────────────────────────────────────────────────
export interface Appointment {
    id?: string
    clinicId: string
    patientId: string
    patientName?: string
    doctorId: string
    nurseId?: string
    scheduledAt: string                   // ISO 8601 datetime string
    duration: number
    status: 'pending' | 'confirmed' | 'arrived' | 'in-progress' | 'completed' | 'cancelled'
    dispenseStatus?: 'pending' | 'ready'
    paymentStatus?: 'pending' | 'paid'
    paymentDetails?: PaymentDetails
    type: 'initial' | 'followup' | 'urgent'
    notes?: string
    externalBookingId?: string
    source: 'internal' | 'external'
    dateStr: string                       // YYYY-MM-DD
    createdAt: string                     // ISO 8601
}

// ─── Consultation ─────────────────────────────────────────────────────────────
export interface HerbItem {
    herbId: string
    name: string
    dosage: string
}

export interface Consultation {
    id?: string
    clinicId: string
    appointmentId: string
    patientId: string
    doctorId: string
    clinicalNotes: {
        chiefComplaint: string
        diagnosis: string
        treatmentPlan: string
        [key: string]: any
    }
    prescription: {
        formulas: Array<{
            name?: string
            herbItems: Array<{
                name: string
                dosage: number
                unit: string
                instruction?: string
            }>
            days: number
            dosesPerDay: number
        }>
        totalDays: number
        advice?: string
        contraindications?: string
    }
    acupuncture?: Array<{
        meridian: string;
        acupoint: string;
        method: string;
        location: string;
    }>;
    otherTreatments?: string;
    billing?: Array<{
        name: string;
        price: number;
        qty: number;
    }>;
    status: 'completed' | 'draft'
    createdAt: string                     // ISO 8601
    updatedAt?: string                    // ISO 8601
}

// ─── Knowledge ────────────────────────────────────────────────────────────────
export interface KnowledgeItem {
    id?: string
    source: string
    chapter?: string
    verse?: string
    commentary?: string
    tags: string[]
    relatedHerbs: string[]
    type: 'classical' | 'herb_pair' | 'meridian' | 'formula'
}

// ─── Billing ──────────────────────────────────────────────────────────────────
export interface BillingItem {
    description: string
    quantity: number
    unitPrice: number
}

export interface Invoice {
    id?: string
    clinicId: string
    patientId: string
    consultationId: string
    items: BillingItem[]
    subtotal: number
    discount?: number
    total: number
    status: 'draft' | 'issued' | 'paid' | 'overdue'
    issuedAt?: string                     // ISO 8601
    createdAt: string                     // ISO 8601
}

// ─── Clinic Service（診所收費項目設定）────────────────────────────────────────
export interface ClinicService {
    id?: string
    clinicId: string
    name: string
    category: ServiceCategory
    defaultPrice: number
    unit: string                          // '次' | '天' | '帖' 等
    isActive: boolean
    sortOrder?: number
    createdAt?: string
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export interface InventoryItem {
    id?: string
    clinicId: string
    name: string
    nameEn?: string
    category: string
    stockGrams: number
    unitPrice: number
    reorderThreshold: number
    supplier?: string
    updatedAt: string                     // ISO 8601
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export type ThemeKey = 'crimson' | 'ocean' | 'forest' | 'midnight' | 'amber'

export interface ThemeConfig {
    key: ThemeKey
    label: string
    primary: string
    bg: string
    surface: string
    border: string
    text: string
}