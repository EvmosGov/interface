import { DIFFUSION } from 'constants/tokens'
import { BigNumber } from 'ethers'
import { useToken } from 'hooks/Tokens'
import { useComplexRewarderTime, useMiniChef, usePairContract } from 'hooks/useContract'
import { useTotalSupply } from 'hooks/useTotalSupply'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { useV2Pair } from 'hooks/useV2Pairs'

import { useActiveWeb3React } from 'hooks/web3'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { BigintIsh } from 'sdk-core/constants'
import { Currency, CurrencyAmount, Token } from 'sdk-core/entities'
import { NEVER_RELOAD, useSingleCallResult, useSingleContractMultipleData } from 'state/multicall/hooks'
import { useTokenBalance } from 'state/wallet/hooks'
import { isTruthy } from 'utils/isTruthy'
import { Pair } from 'v2-sdk/entities'

export function usePairTokens(pairAddress?: string) {
  const { account } = useActiveWeb3React()

  const minichef = useMiniChef()
  const pairContract = usePairContract(pairAddress)
  const token0CallAddress = useSingleCallResult(pairContract, 'token0', [], NEVER_RELOAD)
  const token1CallAddress = useSingleCallResult(pairContract, 'token1', [], NEVER_RELOAD)
  const token0 = useToken(token0CallAddress.result?.[0])
  const token1 = useToken(token1CallAddress.result?.[0])
  const lpToken = useToken(pairAddress)
  const availableLPAmount = useTokenBalance(account ?? undefined, lpToken ?? undefined)

  const totalPoolStaked = useTokenBalance(minichef?.address, lpToken ?? undefined)
  const [, pair] = useV2Pair(token0 ?? undefined, token1 ?? undefined)

  return {
    token0,
    token1,
    lpToken,
    pair,
    availableLPAmount,
    totalPoolStaked,
  }
}

export const NOMAD_POOLS: number[] = [0, 2, 3]

export function usePools() {
  const { account, chainId } = useActiveWeb3React()
  const minichefContract = useMiniChef()

  const poolLength = useSingleCallResult(minichefContract, 'poolLength', [], { blocksPerFetch: 25 })

  const poolLengthAmount = (poolLength?.result?.pools as BigNumber) || BigNumber.from(0)
  const allIndizes = new Array(poolLengthAmount.toNumber()).fill('').map((_, id) => id)
  const poolIndizes = allIndizes //.filter((a) => !NOMAD_POOLS.includes(a))

  const poolInfos = useSingleContractMultipleData(
    minichefContract,
    'poolInfo',
    poolIndizes.map((id) => [id]),
    { blocksPerFetch: 26 }
  )
  const lpTokens = useSingleContractMultipleData(
    minichefContract,
    'lpToken',
    poolIndizes.map((id) => [id]),
    { blocksPerFetch: 27 }
  )

  const rewarders = useSingleContractMultipleData(
    minichefContract,
    'rewarder',
    poolIndizes.map((id) => [id]),
    { blocksPerFetch: 28 }
  )

  const userInfos = useSingleContractMultipleData(
    minichefContract,
    'userInfo',
    poolIndizes.map((id) => [id, account ?? undefined]),
    { blocksPerFetch: 29 }
  )

  const diffusionPerSecondResponse = useSingleCallResult(minichefContract, 'diffusionPerSecond', [], {
    blocksPerFetch: 22,
  })
  const diffusionPerSecond = diffusionPerSecondResponse.result?.[0]
    ? JSBI.BigInt(diffusionPerSecondResponse.result[0].toString())
    : JSBI.BigInt(0)

  const totalAllocationResponse = useSingleCallResult(minichefContract, 'totalAllocPoint', [], { blocksPerFetch: 4 })
  const totalAllocation = totalAllocationResponse.result?.[0] as BigNumber | undefined

  const pendingArguments = account ? poolIndizes.map((pid) => [pid, account]) : []
  const pendingDiffusions = useSingleContractMultipleData(minichefContract, 'pendingDiffusion', pendingArguments, {
    blocksPerFetch: 4,
  })

  const pools: MinichefRawPoolInfo[] = useMemo(() => {
    return poolIndizes
      .map((poolId, idx) => {
        const lpTokenAddress = lpTokens[idx]?.result?.[0] as string | undefined
        const rewarderAddress = rewarders[idx]?.result?.[0] as string | undefined
        const poolInfo = poolInfos[idx]?.result as unknown as PoolInfo
        const userInfo = userInfos[idx]?.result as unknown as { amount: BigNumber; rewardDebt: BigNumber } | undefined

        const poolEmissionPerSecond =
          poolInfo?.allocPoint && totalAllocation
            ? JSBI.divide(
                JSBI.multiply(diffusionPerSecond, JSBI.BigInt(poolInfo.allocPoint.toString())),
                JSBI.BigInt(totalAllocation.toString())
              )
            : undefined

        const poolEmissionAmount = chainId
          ? CurrencyAmount.fromRawAmount(DIFFUSION[chainId], poolEmissionPerSecond || 0)
          : undefined

        const pendingResult = account
          ? (pendingDiffusions[idx]?.result as unknown as { pending: BigNumber })
          : undefined
        if (!lpTokenAddress || !poolInfo) {
          return null
        }

        const rawInfo: MinichefRawPoolInfo = {
          lpTokenAddress,
          rewarderAddress,
          poolInfo: {
            accDiffusionPerShare: poolInfo?.accDiffusionPerShare,
            allocPoint: poolInfo?.allocPoint,
            lastRewardTime: poolInfo?.lastRewardTime,
          },
          pendingAmount: chainId
            ? CurrencyAmount.fromRawAmount(DIFFUSION[chainId], JSBI.BigInt(pendingResult?.pending?.toString() || 0))
            : undefined,
          stakedRawAmount: JSBI.BigInt(userInfo?.amount.toString() || 0),
          poolEmissionAmount,
          poolId,
        }
        return rawInfo
      })
      .filter(isTruthy)
  }, [
    account,
    chainId,
    diffusionPerSecond,
    lpTokens,
    pendingDiffusions,
    poolInfos,
    rewarders,
    totalAllocation,
    userInfos,
    poolIndizes,
  ])
  return pools.filter((pool) => pool.lpTokenAddress)
}

export function usePoolTVL(pair?: Pair) {
  const valueToken0 = useUSDCValue(pair?.reserve0)
  const valueToken1 = useUSDCValue(pair?.reserve1)

  return valueToken0?.multiply(2) || valueToken1?.multiply(2)
}

export function useFarmTVL(pair?: Pair, totalAmountStaked?: CurrencyAmount<Currency>) {
  const totalPoolValue = usePoolTVL(pair)
  const totalSupplyOfStakingToken = useTotalSupply(totalAmountStaked?.currency)
  if (totalPoolValue && totalSupplyOfStakingToken && totalAmountStaked) {
    return totalPoolValue.multiply(totalAmountStaked.quotient).divide(totalSupplyOfStakingToken)
  }
  return undefined
}

export function usePool(poolId: number) {
  const { account, chainId } = useActiveWeb3React()
  const minichefContract = useMiniChef()
  const poolInfos = useSingleCallResult(minichefContract, 'poolInfo', [poolId], { blocksPerFetch: 20 })
  const lpTokens = useSingleCallResult(minichefContract, 'lpToken', [poolId], { blocksPerFetch: 19 })

  const rewarders = useSingleCallResult(minichefContract, 'rewarder', [poolId], { blocksPerFetch: 22 })

  const userInfos = useSingleCallResult(minichefContract, 'userInfo', [poolId, account ?? undefined], {
    blocksPerFetch: 21,
  })

  const diffusionPerSecondResponse = useSingleCallResult(minichefContract, 'diffusionPerSecond', [], {
    blocksPerFetch: 18,
  })
  const diffusionPerSecond = diffusionPerSecondResponse.result?.[0]
    ? JSBI.BigInt(diffusionPerSecondResponse.result[0].toString())
    : JSBI.BigInt(0)

  const totalAllocationResponse = useSingleCallResult(minichefContract, 'totalAllocPoint', [], { blocksPerFetch: 19 })
  const totalAllocation = totalAllocationResponse.result?.[0] as BigNumber | undefined
  const pendingDiffusions = useSingleCallResult(minichefContract, 'pendingDiffusion', [poolId, account ?? undefined])

  const lpTokenAddress = lpTokens?.result?.[0] as string | undefined
  const rewarderAddress = rewarders?.result?.[0] as string | undefined
  const poolInfo = poolInfos?.result as unknown as PoolInfo
  const userInfo = userInfos?.result as unknown as { amount: BigNumber; rewardDebt: BigNumber } | undefined

  const poolEmissionPerSecond =
    poolInfo?.allocPoint && totalAllocation && totalAllocation.gt(0)
      ? JSBI.divide(
          JSBI.multiply(diffusionPerSecond, JSBI.BigInt(poolInfo.allocPoint.toString())),
          JSBI.BigInt(totalAllocation.toString())
        )
      : undefined

  const poolEmissionAmount = chainId
    ? CurrencyAmount.fromRawAmount(DIFFUSION[chainId], poolEmissionPerSecond || 0)
    : undefined

  const pendingResult = account ? (pendingDiffusions?.result as unknown as { pending: BigNumber }) : undefined
  if (!lpTokenAddress || !poolInfo) {
    return null
  }

  const rawInfo: MinichefRawPoolInfo = {
    lpTokenAddress,
    rewarderAddress,
    poolInfo: {
      accDiffusionPerShare: poolInfo?.accDiffusionPerShare,
      allocPoint: poolInfo?.allocPoint,
      lastRewardTime: poolInfo?.lastRewardTime,
    },
    pendingAmount: chainId
      ? CurrencyAmount.fromRawAmount(DIFFUSION[chainId], JSBI.BigInt(pendingResult?.pending?.toString() || 0))
      : undefined,
    stakedRawAmount: JSBI.BigInt(userInfo?.amount.toString() || 0),
    poolEmissionAmount,
    poolId,
  }
  return rawInfo
}

export function useRewardInfos(pid: number, rewardContractAddress?: string) {
  const { account } = useActiveWeb3React()
  const rewarderContract = useComplexRewarderTime(rewardContractAddress)
  const pendingTokens = useSingleCallResult(rewarderContract, 'pendingTokens', [
    pid,
    account ?? '0x0000000000000000000000000000000000000000',
    0,
  ])
  const rewardToken = useToken(pendingTokens?.result?.rewardTokens[0])
  const rewardPerSecondResponse = useSingleCallResult(rewarderContract, 'rewardPerSecond')

  const poolInfos = useSingleCallResult(rewarderContract, 'poolInfo', [pid])
  const poolInfo = poolInfos?.result as unknown as PoolInfo

  const totalAllocationResponse = useSingleCallResult(rewarderContract, 'totalAllocPoint')
  const totalAllocation = totalAllocationResponse.result?.[0] as BigNumber | undefined

  console.log('PoolId', pid)
  // console.log('Account', account)
  // console.log('RewarderContract', rewardContractAddress)
  // console.log('RewardPerSecondResponse', rewardPerSecondResponse)
  // console.log('pendingTokens', pendingTokens)
  // console.log('poolInfo', poolInfos)

  const rewardPerSecondAmount = useMemo(() => {
    if (!rewardToken) {
      console.log('No RewardToken')
      return undefined
    }

    const totalRewardPerSecond: JSBI = JSBI.BigInt(rewardPerSecondResponse.result?.[0].toString() || 0)
    // console.log('poolInfo?.allocPoint', poolInfo?.allocPoint, 'totalAllocation', totalAllocation)
    // console.log('totalAllocation.gt(0)', totalAllocation?.gt(0))
    // console.log('totalRewardPerSecond', totalRewardPerSecond)
    const poolEmissionPerSecond =
      poolInfo?.allocPoint && totalAllocation && totalAllocation.gt(0) && totalRewardPerSecond
        ? JSBI.divide(
            JSBI.multiply(totalRewardPerSecond, JSBI.BigInt(poolInfo.allocPoint.toString())),
            JSBI.BigInt(totalAllocation.toString())
          )
        : JSBI.BigInt(0)
    console.log('Emission', totalRewardPerSecond.toString(), poolInfo.allocPoint.toString())
    return CurrencyAmount.fromRawAmount(rewardToken, poolEmissionPerSecond)
  }, [poolInfo?.allocPoint, rewardPerSecondResponse.result, rewardToken, totalAllocation])

  console.log('Significant', rewardPerSecondAmount?.multiply(1000000000000).toSignificant())

  const pendingAmount = useMemo(() => {
    if (!rewardToken) {
      return undefined
    }
    return CurrencyAmount.fromRawAmount(
      rewardToken,
      JSBI.BigInt(pendingTokens?.result?.rewardAmounts?.[0].toString() || 0)
    )
  }, [pendingTokens?.result?.rewardAmounts, rewardToken])

  return {
    pendingAmount,
    rewardPerSecondAmount,
    poolInfo: {
      accEmissionPerShare: poolInfo?.accDiffusionPerShare,
      allocPoint: poolInfo?.allocPoint,
      lastRewardTime: poolInfo?.lastRewardTime,
    },
  }
}

export function useOwnWeeklyEmission(
  poolEmission?: CurrencyAmount<Token>,
  stakedLPAmount?: CurrencyAmount<Token>,
  totalPoolStaked?: CurrencyAmount<Token>
) {
  return useMemo(() => {
    const hypotheticalEmissionPerWeek =
      totalPoolStaked && stakedLPAmount && totalPoolStaked.greaterThan(0) && poolEmission
        ? poolEmission
            .multiply(JSBI.BigInt(60 * 60 * 24 * 7))
            .multiply(stakedLPAmount)
            .divide(totalPoolStaked)
        : poolEmission?.currency
        ? CurrencyAmount.fromRawAmount(poolEmission?.currency, JSBI.BigInt(0))
        : undefined

    return hypotheticalEmissionPerWeek
  }, [poolEmission, stakedLPAmount, totalPoolStaked])
}

export function useCalculateAPR(poolEmissionPerSecond?: CurrencyAmount<Token>, farmTVL?: CurrencyAmount<Token>) {
  // return JSBI.BigInt(0)
  const fractionOfPool = 1000

  const hypotheticalEmissionPerYear = poolEmissionPerSecond
    ?.multiply(JSBI.BigInt(60 * 60 * 24 * 365))
    .divide(fractionOfPool)

  const valueOfYearlyEmission = useUSDCValue(hypotheticalEmissionPerYear)

  const inputAmount = farmTVL?.divide(fractionOfPool)

  const apr =
    valueOfYearlyEmission && inputAmount && JSBI.greaterThan(inputAmount.quotient, JSBI.BigInt('0'))
      ? JSBI.divide(valueOfYearlyEmission?.multiply(100).quotient, inputAmount?.quotient)
      : JSBI.BigInt(0)

  return apr
}

export interface MinichefRawPoolInfo {
  lpTokenAddress: string
  rewarderAddress?: string
  poolInfo: PoolInfo
  stakedRawAmount: BigintIsh
  pendingAmount?: CurrencyAmount<Token>
  poolEmissionAmount?: CurrencyAmount<Token>
  poolId: number
}

type PoolInfo = {
  accDiffusionPerShare: BigNumber
  allocPoint: BigNumber
  lastRewardTime: BigNumber
}
