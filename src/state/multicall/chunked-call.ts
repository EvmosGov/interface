import { Contract } from 'ethers'
import { Interface } from 'ethers/lib/utils'
import { chunk } from 'lodash'
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
  const [c1, c2, c3, c4, c5, c6] = chunk(callInputs, pageSize)
  const r1 = useSingleContractMultipleData(contract, methodName, c1, options, gasRequired)
  const r2 = useSingleContractMultipleData(contract, methodName, c2, options, gasRequired)
  const r3 = useSingleContractMultipleData(contract, methodName, c3, options, gasRequired)
  const r4 = useSingleContractMultipleData(contract, methodName, c4, options, gasRequired)
  const r5 = useSingleContractMultipleData(contract, methodName, c5, options, gasRequired)
  const r6 = useSingleContractMultipleData(contract, methodName, c6, options, gasRequired)

  return [...r1, ...r2, ...r3, ...r4, ...r5, ...r6]
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
  if (addresses.length > 300) {
    console.error(new Error(`Getting callinput with length ${addresses.length}, but 300 is the max`))
  }
  const [c1, c2, c3, c4, c5, c6] = chunk(addresses, pageSize)
  const r1 = useMultipleContractSingleData(c1, contract, methodName, callInputs, options, gasRequired)
  const r2 = useMultipleContractSingleData(c2, contract, methodName, callInputs, options, gasRequired)
  const r3 = useMultipleContractSingleData(c3, contract, methodName, callInputs, options, gasRequired)
  const r4 = useMultipleContractSingleData(c4, contract, methodName, callInputs, options, gasRequired)
  const r5 = useMultipleContractSingleData(c5, contract, methodName, callInputs, options, gasRequired)
  const r6 = useMultipleContractSingleData(c6, contract, methodName, callInputs, options, gasRequired)

  return [...r1, ...r2, ...r3, ...r4, ...r5, ...r6]
}
