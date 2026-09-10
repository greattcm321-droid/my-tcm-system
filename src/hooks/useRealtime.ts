import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../config/supabase'

export interface FilterConstraint {
    column: string;
    operator: string;
    value: any;
}

/**
 * 替換 Firebase where 的相容介面。
 * 支援 '==' -> 'eq', '!=' -> 'neq', 等等。
 */
export function where(column: string, operator: string, value: any): FilterConstraint {
    const opMap: Record<string, string> = {
        '==': 'eq',
        '!=': 'neq',
        '>': 'gt',
        '<': 'lt',
        '>=': 'gte',
        '<=': 'lte'
    };
    
    // 將前端傳入的 camelCase 欄位名稱轉為 snake_case (e.g., dateStr -> date_str)
    // 但排除已經是 snake_case 或是縮寫的狀況
    const snakeColumn = column.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    return { column: snakeColumn, operator: opMap[operator] || 'eq', value };
}

// 簡易 camelCase 轉換器，用於將 DB 取回的全量資料轉為前端可用型別
function toCamelCase(str: string) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function keysToCamel(o: any): any {
    if (o === null || o === undefined) return o;
    if (typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(keysToCamel);
    
    const n: any = {};
    Object.keys(o).forEach((k) => {
        n[toCamelCase(k)] = keysToCamel(o[k]);
    });
    return n;
}

/**
 * Supabase Realtime listener hook。
 * 自動過濾 clinicId，返回實時資料流。
 */
export function useRealtime<T>(
    collectionName: string,
    clinicId: string,
    extraConstraints: FilterConstraint[] = [],
    deps: any[] = []
) {
    const [data, setData] = useState<(T & { id: string })[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // 使用 JSON.stringify 以避免 constraints 每次 render 都是新 reference 導致無窮迴圈
    const constraintsStr = JSON.stringify(extraConstraints);

    const fetchData = useCallback(async () => {
        if (!clinicId) return;
        
        try {
            // 基本過濾
            let query = supabase.from(collectionName).select('*').eq('clinic_id', clinicId);
            
            // 附加過濾 (來自 where helper)
            const constraints = JSON.parse(constraintsStr) as FilterConstraint[];
            for (const constraint of constraints) {
                // @ts-ignore
                query = query[constraint.operator](constraint.column, constraint.value);
            }
            
            const { data: resultData, error: fetchError } = await query;
            
            if (fetchError) throw fetchError;
            
            // 由於 Supabase 傳回的是 snake_case，我們需要做通用轉換
            setData((resultData || []).map((row: any) => keysToCamel(row)));
            setError(null);
        } catch (err: any) {
            console.error(`[useRealtime] Error fetching ${collectionName}:`, err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [collectionName, clinicId, constraintsStr]);

    useEffect(() => {
        if (!clinicId) return;

        setLoading(true);
        fetchData();

        // 訂閱 Postgres Changes 進行資料隔離安全防護
        const channel = supabase.channel(`realtime:${collectionName}:${clinicId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: collectionName,
                filter: `clinic_id=eq.${clinicId}` 
            }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData, ...deps]);

    return { data, loading, error }
}
