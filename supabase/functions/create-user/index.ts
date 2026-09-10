import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const email = body.email
        const name = body.name
        const role = body.role
        const clinic_id = body.clinic_id
        const specialization = body.specialization
        // 如果沒有提供密碼，自動生成隨機 UUID 當作臨時密碼
        const password = body.password || crypto.randomUUID()

        if (!email || !name || !role || !clinic_id) {
            throw new Error("缺少必填欄位 (email, name, role, clinic_id)")
        }

        // 初始化 Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 步驟一：呼叫 supabase.auth.admin.createUser 建立登入大腦
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError) {
            throw authError
        }

        const user = authData.user
        if (!user) {
            throw new Error("建立使用者失敗，未回傳 user 資訊")
        }

        // 步驟二：拿著建立成功回傳的 user.id，連同 name, role, clinic_id 寫入 public.users 資料表
        const now = new Date().toISOString()
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .insert([{
                id: user.id,
                email: email,
                display_name: name,
                role: role,
                clinic_id: clinic_id,
                specialization: specialization || null,
                bookmarks: [],
                created_at: now,
            }])

        if (dbError) {
            // 如果步驟二失敗，必須 Rollback（刪除剛剛建立的 auth user）
            await supabaseAdmin.auth.admin.deleteUser(user.id)
            throw dbError
        }

        return new Response(JSON.stringify({ success: true, user_id: user.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
