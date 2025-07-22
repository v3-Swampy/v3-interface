
from typing import Dict, Any
import math

# --- 常量定义 ---

# 一年的秒数，用于 APR/APY 计算的近似值。(31536000)
SECONDS_PER_YEAR = 365 * 24 * 60 * 60

# --- 类型别名 ---
# 在 Python 中，bytes 表示任意长度的定长数组类型，实际长度在注释中说明。

# TokenID 代表一个非同质化代币（NFT）的唯一标识符，32 字节。
TokenID = bytes
# Address 代表一个区块链地址，通常为 20 字节。
Address = bytes


# --- 核心类定义 ---

class Tick:
    """
    Tick 代表了在集中流动性做市商（如 Uniswap V3）中一个离散化的价格点位。
    价格不是连续的，而是由一系列的 tick 来表示。
    """
    # tick 的整数索引值。
    tick: int

    @property
    def price(self) -> float:
        """
        根据 tick 索引计算出对应的实际价格。
        公式为 1.0001 的 tick 次方。
        """
        return 1.0001 ** self.tick

    @property
    def sqrtPrice(self) -> float:
        """
        计算当前 tick 对应价格的平方根。
        在 V3-like 的 AMM 中，使用价格的平方根进行计算可以优化数学运算。
        """
        return math.sqrt(self.price())
        
    def __eq__(self, other: Any) -> bool:
        return self.tick == other.tick

    def __lt__(self, other: Any) -> bool:
        return self.tick < other.tick


class UniswapV3PoolInfo:
    """
    存储一个 Uniswap V3-like 流动性池的必要上下文信息。
    """
    # 池子当前的活跃 tick，它决定了池子的当前交易价格。
    currentTick: Tick


class UserToken:
    """
    代表一个用户的非同质化流动性头寸（LP Token）。
    它定义了用户在特定价格范围内存入的流动性。
    """
    # 用户存入的原始流动性数量（liquidity），这是一个抽象的数值。
    liquidity: int
    # 用户设置的流动性价格区间的下边界。
    lowerTick: Tick
    # 用户设置的流动性价格区间的上边界。
    upperTick: Tick
    # 该流动性头寸所属的 V3 池的上下文信息。
    # 在实际代码中，Incentive Key 是 V3 Pool 的 Address，伪代码中我们将其写成 V3 Pool，表示在 V3 Pool 中需要的上下文。
    pool: UniswapV3PoolInfo
    
    @property
    def token0Amount(self) -> float:
        """
        计算当前头寸中实时包含的 token0 的数量。
        """
        lower = max(self.pool.currentTick, self.lowerTick)
        upper = max(self.pool.currentTick, self.upperTick)
        
        return self.liquidity * (upper.sqrtPrice() - lower.sqrtPrice()) / (upper.sqrtPrice() * lower.sqrtPrice())
    
    @property
    def token1Amount(self) -> float:
        """
        计算当前头寸中实时包含的 token1 的数量。
        """
        lower = min(self.pool.currentTick, self.lowerTick)
        upper = min(self.pool.currentTick, self.upperTick)
        
        return self.liquidity * (upper.sqrtPrice() - lower.sqrtPrice())
    
    @property
    def inPriceRange(self) -> bool:
        """
        检查当前池子的价格是否在该流动性头寸设定的价格区间内。
        只有在价格区间内，该头寸才是“活跃”的，能够赚取交易费和参与激励。
        V3 的区间是左闭右开 [lower, upper)。
        """
        currentTick = self.pool.currentTick.tick
        upperTick = self.upperTick.tick
        lowerTick = self.lowerTick.tick
        return currentTick >= lowerTick and currentTick < upperTick

def currentTimestamp() -> int:
    """
    获取当前的区块链时间戳（Unix timestamp in seconds）。
    这是一个外部函数，具体实现略。
    """
    # 实际实现将从区块链节点或可信源获取。
    pass
      
class IncentiveKey:
    """
    一个用于唯一标识一个激励计划 (Incentive) 的结构体。
    它由奖励代币、开始时间和结束时间共同定义。
    """
    # 奖励代币的合约地址。
    rewardTokenAddress: Address
    # 激励计划开始的 Unix 时间戳。
    startTimestamp: int
    # 激励计划结束的 Unix 时间戳。
    endTimestamp: int

    @property
    def inTimeRange(self) -> bool:
        """
        检查当前时间是否在激励计划的有效时间范围内。
        """
        return self.startTimestamp >= currentTimestamp() and currentTimestamp() < self.endTimestamp


class Incentive:
    """
    描述一个激励计划的全局状态。
    """
    # 参与当前 incentive 的 token0 总数量
    token0Amount: int

    # 参与当前 incentive 的 token1 总数量
    token1Amount: int

    # 当前 incentive 中尚未释放的奖励 token 总量
    tokenUnreleased: int

    # 当前 incentive 的名义奖励生成速率 (token 每秒)。
    # 注意：在活跃流动性或激励时间等外部条件导致不产生奖励时，此速率依然返回原有值，而不是零。
    rewardRate: int

    # 如果 Incentive 池活跃流动性为零，则 isEmpty 为 true
    isEmpty: bool


# --- 激励中的质押仓位 (IncentiveStake) ---
class IncentiveStake:
    """
    描述了一个用户的一个 token 在特定激励计划中的质押详情。
    """
    # 当前仓位的原始流动性 (liquidity)
    liquidity: int

    # 经过 boost 因子加成后的计算奖励时的有效流动性 (boosted liquidity)。
    # (boostLiquidity / liquidity) * 3 即为 boost 加速比例。
    boostLiquidity: int

    # 当前 incentive 的名义奖励生成速率 (token 每秒)。
    # 注意：在价格范围或激励时间等外部条件导致不产生奖励时，此速率依然返回原有值，而不是零。
    rewardRate: int

    # 用户在此质押仓位中已产生但尚未结算(settle)的奖励数量。
    unclaimedReward: int


class WorldStateForPool:
    """
    聚合了一个 V3 池所有激励计划的公共信息和全局状态。
    这些数据对所有用户都是相同的。
    """
    # 映射：从激励计划的 Key 到该激励计划的全局状态。
    incentives: Dict[IncentiveKey, Incentive]
    # 映射：从奖励代币地址到其对应的价格（例如，以 USD 计价）。
    # 前端自行获取。
    rewardPrices: Dict[Address, int]
    # 池中 token0 的价格。
    # 前端自行获取。
    token0Price: int
    # 池中 token1 的价格。
    # 前端自行获取。
    token1Price: int

    @property
    def totalSupply(self) -> float:
        """
        计算池中所有激励计划的总锁仓价值 (Total Value Locked, TVL)。
        理想情况下，通过后台服务自动为用户添加 stake 了所有 incentive，所有 incentive 的 total supply 是一致的。
        但如果用户绕开前端，特殊情况下可能不一致，这里我们取最大值，即假设用户也服从了产品 stake 所有的逻辑。
        """
        return max([incentive.token0Amount * self.token0Price + incentive.token1Amount * self.token1Price for incentive in self.incentives.values()])

    @property
    def totalRewardsPerSecond(self) -> float:
        """
        计算池中所有激励计划每秒分发的奖励的总价值。
        """
        totalRewardRate = 0
        for (key, incentive) in self.incentives.items():
            # 如果不在 incentive 奖励周期内，或者 incentive 有效质押为空
            if key.inTimeRange() and not incentive.isEmpty:
                price = self.rewardPrices[incentive.rewardTokenAddress]
                totalRewardRate += price * incentive.rewardRate
        return totalRewardRate

    @property
    def APR(self) -> float:
        """
        计算整个池子的总年化收益率 (APR)。
        这是基于池子的总 TVL 和总奖励速率计算得出的一个宏观指标。
        """
        return self.totalRewardsPerSecond() / self.totalSupply() * SECONDS_PER_YEAR


class UserStateForPool(WorldStateForPool):
    """
    描述了一个用户在一个 V3 Pool 质押池中所有消息的详情。
    继承自 WorldStateForPool 以复用全局信息。
    """
    # 用户在当前池子的所有 token，在前端称为 Position。
    tokens: Dict[TokenID, UserToken]

    # 用户的质押详情。每一个 token 可能 stake 在多个 Incentive 中。
    # 结构: { tokenID -> { incentiveKey -> IncentiveStake } }
    stakes: Dict[TokenID, Dict[IncentiveKey, IncentiveStake]]

    def totalSupplyForToken(self, tokenId: TokenID) -> float:
        """[前端展示数据] 计算用户单个动性头寸的价值。"""
        
        token = self.tokens[tokenId]
        return token.token0Amount() * self.token0Price + token.token0Amount() * self.token1Price

    def activeSupplyForToken(self, tokenId: TokenID) -> float:
        """计算用户单个活跃（在至少一个激励计划中产生收益）流动性头寸的价值。"""

        active = any([self.isStakeActive(key, tokenId) for key in self.stakes[tokenId].keys()])
        if active:
            return self.totalSupplyForToken(tokenId)
        else:
            return 0

    def rewardRateForToken(self, tokenId: TokenID) -> int:
        """计算用户单个流动性头寸当前每秒赚取的奖励总价值。"""
        stakesForToken = self.stakes[tokenId]

        totalRewardRate = 0
        for (key, stake) in stakesForToken.items():
            if self._isStakeActice(key, tokenId):
                price = self.rewardPrices[stake.rewardTokenAddress]
                totalRewardRate += price * stake.rewardRate
        return totalRewardRate

    def claimableForToken(self, tokenId: TokenID) -> Dict[Address, int]:
        """ [前端展示数据] 汇总用户单个流动性头寸所有待领取的奖励，按奖励代币地址分类。 """
        
        stakesForToken = self.stakes[tokenId]

        totalClaimable = dict()
        for (key, stake) in stakesForToken.items():
            # 不存在的 key 假设值为 0，伪代码不再展示检查存在性和设置默认值的逻辑
            totalClaimable[key.rewardTokenAddress] += stake.unclaimedReward

        return totalClaimable

    @property
    def allSupply(self) -> float:
        """计算用户在该池中所有流动性头寸的总价值。"""
        
        return sum([self.totalSupplyForToken(tokenId) for tokenId in self.tokens.keys()])

    @property
    def allActiveSupply(self) -> float:
        """计算用户在该池中所有活跃（在至少一个激励计划中产生收益）流动性头寸的总价值。"""
        
        return sum([self.activeSupplyForToken(tokenId) for tokenId in self.tokens.keys()])

    @property
    def allRewardRate(self) -> float:
        """计算用户在该池中所有头寸当前每秒赚取的奖励总价值。"""
        
        return sum([self.rewardRateForToken(tokenId) for tokenId in self.tokens.keys()])

    @property
    def allClaimable(self) -> float:
        """[前端展示数据] 汇总用户在该池中所有头寸的全部待领取奖励。"""
        
        return sum([self.claimableForToken(tokenId) for tokenId in self.tokens.keys()])

    
    @property
    def APR(self) -> float:
        """[前端展示数据] 计算用户的个人综合年化收益率 (APR)。"""
        
        return self.allRewardRate() / self.allActiveSupply() * SECONDS_PER_YEAR

    def isStakeActive(self, key: IncentiveKey, tokenId: TokenID) -> bool:
        """ 判断一个具体的质押当前是否是活跃的。"""
        
        token = self.tokens[tokenId]
        return key.inTimeRange() and token.inPriceRange()

    @property
    def boostRatio(self) -> float:
        """[前端展示数据] 计算用户的平均 Boost 加速比例。"""
        
        totalLiquidity = sum([stake.liquidity for tokenId in self.tokens.keys() for stake in self.stakes[tokenId].values()])
        totalBoostLiquidity = sum([stake.boostLiquidity for tokenId in self.tokens.keys() for stake in self.stakes[tokenId].values()])
        return totalBoostLiquidity / totalLiquidity * 3
