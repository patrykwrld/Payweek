import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Tables, TablesInsert, TablesUpdate } from './database.types'

// Row volumes are tiny (one user's data), so each table is fetched whole
// and filtered client-side; RLS scopes rows to the signed-in user.

export function useAgencies() {
  return useQuery({
    queryKey: ['agencies'],
    queryFn: async (): Promise<Tables<'agencies'>[]> => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useRateRules() {
  return useQuery({
    queryKey: ['rate_rules'],
    queryFn: async (): Promise<Tables<'rate_rules'>[]> => {
      const { data, error } = await supabase
        .from('rate_rules')
        .select('*')
        .order('priority', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useShifts() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: async (): Promise<Tables<'shifts'>[]> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

type Table = 'agencies' | 'rate_rules' | 'shifts' | 'profiles' | 'payslips'

function useInvalidating<TArgs, TResult>(
  table: Table,
  fn: (args: TArgs) => Promise<TResult>,
): UseMutationResult<TResult, Error, TArgs> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void client.invalidateQueries({ queryKey: [table] }),
  })
}

export function useInsertAgency() {
  return useInvalidating('agencies', async (values: TablesInsert<'agencies'>) => {
    const { data, error } = await supabase
      .from('agencies')
      .insert(values)
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export function useUpdateAgency() {
  return useInvalidating(
    'agencies',
    async ({ id, ...values }: TablesUpdate<'agencies'> & { id: string }) => {
      const { error } = await supabase.from('agencies').update(values).eq('id', id)
      if (error) throw error
    },
  )
}

export function useDeleteAgency() {
  return useInvalidating('agencies', async (id: string) => {
    const { error } = await supabase.from('agencies').delete().eq('id', id)
    if (error) throw error
  })
}

export function useInsertRule() {
  return useInvalidating('rate_rules', async (values: TablesInsert<'rate_rules'>) => {
    const { error } = await supabase.from('rate_rules').insert(values)
    if (error) throw error
  })
}

export function useUpdateRule() {
  return useInvalidating(
    'rate_rules',
    async ({ id, ...values }: TablesUpdate<'rate_rules'> & { id: string }) => {
      const { error } = await supabase.from('rate_rules').update(values).eq('id', id)
      if (error) throw error
    },
  )
}

export function useDeleteRule() {
  return useInvalidating('rate_rules', async (id: string) => {
    const { error } = await supabase.from('rate_rules').delete().eq('id', id)
    if (error) throw error
  })
}

export function useInsertShift() {
  return useInvalidating('shifts', async (values: TablesInsert<'shifts'>) => {
    const { error } = await supabase.from('shifts').insert(values)
    if (error) throw error
  })
}

export function useUpdateShift() {
  return useInvalidating(
    'shifts',
    async ({ id, ...values }: TablesUpdate<'shifts'> & { id: string }) => {
      const { error } = await supabase.from('shifts').update(values).eq('id', id)
      if (error) throw error
    },
  )
}

export function useDeleteShift() {
  return useInvalidating('shifts', async (id: string) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) throw error
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Tables<'profiles'> | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpsertProfile() {
  return useInvalidating(
    'profiles',
    async (values: TablesInsert<'profiles'>) => {
      const { error } = await supabase.from('profiles').upsert(values)
      if (error) throw error
    },
  )
}

export function usePayslips() {
  return useQuery({
    queryKey: ['payslips'],
    queryFn: async (): Promise<Tables<'payslips'>[]> => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .order('period_end', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useInsertPayslip() {
  return useInvalidating('payslips', async (values: TablesInsert<'payslips'>) => {
    const { error } = await supabase.from('payslips').insert(values)
    if (error) throw error
  })
}

export function useDeletePayslip() {
  return useInvalidating('payslips', async (id: string) => {
    const { error } = await supabase.from('payslips').delete().eq('id', id)
    if (error) throw error
  })
}
