import { Contract } from 'ethers'
import { Interface } from 'ethers/lib/utils'
import { chunk } from 'lodash'
import { useEffect, useMemo } from 'react'
import { ListenerOptions } from './actions'
import { CallState, OptionalMethodInputs, useMultipleContractSingleData, useSingleContractMultipleData } from './hooks'

export function useSingleContractMultipleDataChunked(
  contract: Contract | null | undefined,
  methodName: string,
  callInputs: OptionalMethodInputs[],
  options?: ListenerOptions,
  gasRequired?: number,
  pageSize = 50
): CallState[] {
  if (callInputs.length > 300) {
    console.error(new Error(`Getting callinput with length ${callInputs.length}, but 300 is the max`))
  }
  console.log('useSingleContractMultipleDataChunked', methodName)
  const [c1, c2, c3, c4, c5, c6] = useMemo(() => chunk(callInputs, pageSize), [callInputs, pageSize])
  const r1 = useSingleContractMultipleData(contract, methodName, c1, options, gasRequired)
  const r2 = useSingleContractMultipleData(contract, methodName, c2, options, gasRequired)
  const r3 = useSingleContractMultipleData(contract, methodName, c3, options, gasRequired)
  const r4 = useSingleContractMultipleData(contract, methodName, c4, options, gasRequired)
  const r5 = useSingleContractMultipleData(contract, methodName, c5, options, gasRequired)
  const r6 = useSingleContractMultipleData(contract, methodName, c6, options, gasRequired)

  return useMemo(() => [...r1, ...r2, ...r3, ...r4, ...r5, ...r6], [r1, r2, r3, r4, r5, r6])
}

const counters: Record<string, number> = {}

declare global {
  interface Window {
    _getCounters: () => Record<string, number>
  }
}
window._getCounters = () => {
  return counters
}

export function useMultipleContractSingleDataChunked(
  addresses: (string | undefined)[],
  contract: Interface,
  methodName: string,
  callInputs?: OptionalMethodInputs,
  options?: ListenerOptions,
  gasRequired?: number,
  pageSize = 50
): CallState[] {
  if (addresses.length > 700) {
    console.error(new Error(`Getting callinput with length ${addresses.length}, but 500 is the max`))
  }
  const addressesKey = addresses.join('_')
  useEffect(() => {
    if (addresses.filter(Boolean).length > 0) {
      if (!counters[addressesKey]) {
        counters[addressesKey] = 0
      }
      console.log('useMultipleContractSingleDataChunked', methodName, counters[addressesKey]++)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesKey])

  const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14] = useMemo(
    () => chunk(addresses, pageSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addressesKey, pageSize]
  )
  const r1 = useMultipleContractSingleData(c1, contract, methodName, callInputs, options, gasRequired)
  const r2 = useMultipleContractSingleData(c2, contract, methodName, callInputs, options, gasRequired)
  const r3 = useMultipleContractSingleData(c3, contract, methodName, callInputs, options, gasRequired)
  const r4 = useMultipleContractSingleData(c4, contract, methodName, callInputs, options, gasRequired)
  const r5 = useMultipleContractSingleData(c5, contract, methodName, callInputs, options, gasRequired)
  const r6 = useMultipleContractSingleData(c6, contract, methodName, callInputs, options, gasRequired)
  const r7 = useMultipleContractSingleData(c7, contract, methodName, callInputs, options, gasRequired)
  const r8 = useMultipleContractSingleData(c8, contract, methodName, callInputs, options, gasRequired)
  const r9 = useMultipleContractSingleData(c9, contract, methodName, callInputs, options, gasRequired)
  const r10 = useMultipleContractSingleData(c10, contract, methodName, callInputs, options, gasRequired)
  const r11 = useMultipleContractSingleData(c11, contract, methodName, callInputs, options, gasRequired)
  const r12 = useMultipleContractSingleData(c12, contract, methodName, callInputs, options, gasRequired)
  const r13 = useMultipleContractSingleData(c13, contract, methodName, callInputs, options, gasRequired)
  const r14 = useMultipleContractSingleData(c14, contract, methodName, callInputs, options, gasRequired)

  return useMemo(
    () => [...r1, ...r2, ...r3, ...r4, ...r5, ...r6, ...r7, ...r8, ...r9, ...r10, ...r11, ...r12, ...r13, ...r14],
    [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14]
  )
}
