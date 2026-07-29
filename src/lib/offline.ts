import { QueryClient, onlineManager, useMutationState } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { Tables, TablesInsert, TablesUpdate } from './database.types'
import { supabase } from './supabase'

/** Mutation keys. Writes are queued while offline, so their functions
 * must be registered on the client (below) rather than inline in hooks —
 * that's what lets a queued write resume after an app restart. */
export const mutationKeys = {
  insertShift: ['shifts', 'insert'] as const,
  updateShift: ['shifts', 'update'] as const,
  deleteShift: ['shifts', 'delete'] as const,
}

type ShiftRow = Tables<'shifts'>

/** Optimistic row for a shift that hasn't reached the server yet. */
function optimisticShift(values: TablesInsert<'shifts'>): ShiftRow {
  return {
    id: crypto.randomUUID(),
    user_id: values.user_id ?? 'pending',
    agency_id: values.agency_id,
    date: values.date,
    start_time: values.start_time,
    end_time: values.end_time,
    break_minutes: values.break_minutes ?? 0,
    manual_rate_pence: values.manual_rate_pence ?? null,
    notes: values.notes ?? null,
    created_at: new Date().toISOString(),
  }
}

function sortShifts(rows: ShiftRow[]): ShiftRow[] {
  return [...rows].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time),
  )
}

/**
 * Register every queueable write. Each one updates the cached shift list
 * immediately in `onMutate`, so a shift logged in a warehouse car park
 * appears at once and survives an app restart; the network call runs now
 * if online, or on reconnect if not.
 */
export function registerMutationDefaults(client: QueryClient): void {
  const snapshot = () => client.getQueryData<ShiftRow[]>(['shifts']) ?? []
  const rollback = (context: unknown) => {
    if (Array.isArray(context)) client.setQueryData(['shifts'], context)
  }
  const settle = () => {
    void client.invalidateQueries({ queryKey: ['shifts'] })
  }

  client.setMutationDefaults(mutationKeys.insertShift, {
    mutationFn: async (values: TablesInsert<'shifts'>) => {
      const { error } = await supabase.from('shifts').insert(values)
      if (error) throw error
    },
    onMutate: (values: TablesInsert<'shifts'>) => {
      const previous = snapshot()
      client.setQueryData(
        ['shifts'],
        sortShifts([...previous, optimisticShift(values)]),
      )
      return previous
    },
    onError: (_error, _values, context) => rollback(context),
    onSettled: settle,
  })

  client.setMutationDefaults(mutationKeys.updateShift, {
    mutationFn: async ({
      id,
      ...values
    }: TablesUpdate<'shifts'> & { id: string }) => {
      const { error } = await supabase.from('shifts').update(values).eq('id', id)
      if (error) throw error
    },
    onMutate: ({ id, ...values }: TablesUpdate<'shifts'> & { id: string }) => {
      const previous = snapshot()
      client.setQueryData(
        ['shifts'],
        sortShifts(
          previous.map((row) => (row.id === id ? { ...row, ...values } : row)),
        ),
      )
      return previous
    },
    onError: (_error, _values, context) => rollback(context),
    onSettled: settle,
  })

  client.setMutationDefaults(mutationKeys.deleteShift, {
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shifts').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: (id: string) => {
      const previous = snapshot()
      client.setQueryData(
        ['shifts'],
        previous.filter((row) => row.id !== id),
      )
      return previous
    },
    onError: (_error, _id, context) => rollback(context),
    onSettled: settle,
  })
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  )
}

/** How many writes are waiting for a connection. */
export function useQueuedWriteCount(): number {
  return useMutationState({
    filters: { predicate: (mutation) => mutation.state.isPaused },
  }).length
}
