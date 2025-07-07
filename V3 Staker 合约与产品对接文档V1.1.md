# V3 Staker 合约与产品对接文档 V1.1

[TOC]

## 1. 引言

本文档旨在为 V3 Staker 系统的相关开发、产品及运营人员提供一份统一的参考标准。通过对核心概念、交互流程、关键规则及数据接口的清晰定义，确保各方对系统有共同的理解。

## 2. 核心概念定义

为确保用语的精确与统一，定义以下核心概念：

| 中文术语              | 英文术语           | 定义                                                         |
| --------------------- | ------------------ | ------------------------------------------------------------ |
| **V3 池**             | `pool`             | 指一个 Uniswap V3 流动性池。                                 |
| **V3 流动性质押凭证** | `v3token`          | 代表用户在某个 V3 池中的一个具体流动性仓位 (position) 的非同质化代币 (NFT)。它包含了池地址 (`pool`)、所有者 (`owner`)、价格区间 (`tickLower`, `tickUpper`) 和流动性数量 (`liquidity`) 等关键信息。一个 `v3token` 与一个 V3 池唯一对应。 |
| **激励计划**          | `incentive`        | 一项为特定 V3 池的流动性提供者设计的奖励活动。其核心属性包括：关联的 V3 池 (`pool`)、奖励代币 (`reward token`)、计划开始时间 (`start time`)、结束时间 (`end time`) 以及创建者 (`owner`)。创建者拥有在计划结束后，回收所有未发放奖励的权限。 |
| **活跃流动性**        | `active liquidity` | 所有价格区间 (`tickLower`, `tickUpper`) 覆盖当前价格的 `v3token` 的流动性总和。 |
| **存入**              | `deposit`          | 用户将持有的 `v3token` 存入 Staker 合约的过程。这是参与任何激励计划的前提。 |
| **取出**              | `withdraw`         | 用户从 Staker 合约中取回其 `v3token` 的过程。只有当一个 `v3token` 未质押在任何激励计划中时，该操作才可执行。 |
| **质押**              | `stake`            | 用户将一个已经**存入** (`deposit`) Staker 合约的 `v3token`，质押到一个具体的**激励计划** (`incentive`) 中以赚取奖励的过程。 |
| **解押**              | `unstake`          | 用户将其 `v3token` 从一个**激励计划** (`incentive`) 中退出的过程。 |
| **结算**              | `settle`           | 在用户执行**解押** (`unstake`) 操作时，系统**结算**用户在此次质押期间应获得的奖励总额，并将其记录到用户的个人奖励账户中。 |
| **领取**              | `claim`            | 用户提取其个人奖励账户中已**结算** (`settle`) 奖励的操作。   |

## 3. 合约交互流程与接口说明

### 3.1. 用户交互步骤

用户的核心操作路径如下（合约操作流程而非产品逻辑）：

1. **获取凭证**: 用户首先在 Uniswap V3 协议中提供流动性，从而获得一个代表其流动性仓位的 `v3token`。
2. **存入 Staker**: 用户调用 `deposit` 接口，将 `v3token` 存入 Staker 合约中。此时 `v3token` 由 Staker 合约保管。
3. **参与激励**: 对于已经存入的 `v3token`，用户可以选择一个有效的 `incentive` (激励计划)，并调用 `stake` 接口将该 `v3token` 质押进去，开始赚取奖励。
4. **退出激励**: 用户可在任何时刻调用 `unstake` 接口，将其 `v3token` 从激励计划中解押。此时，系统会立即为其**结算** (`settle`) 应得奖励。
5. **取回凭证**: 对于一个未质押在任何激励计划中的 `v3token`，用户可以调用 `withdraw` 接口，将其从 Staker 合约中完全取回。
6. **领取奖励**: 用户可以随时调用 `claim` 接口，提取其名下所有已结算的奖励。

### 3.2. 管理员交互流程

管理员负责激励计划的生命周期管理：

1. **创建计划**: 管理员调用接口创建 `incentive`，需指定关联的 V3 Pool、奖励代币、起止时间，并提供初始奖励资金。同一个 V3 Pool 最多可以同时存在 **256** 个奖励计划。
2. **管理奖励**: 在激励计划进行期间，管理员可以增加或减少 `unreleased` (待释放) 的奖励金。但**无法**触及已进入 `unsettled` (待结算) 池的奖励。
3. **结束计划**: 当激励计划到期，且所有参与该计划的 `v3token` 都已解押 (`unstake`) 后，管理员可以最终结束该计划，并将 `unreleased` 账本中所有剩余的奖励退还给计划的 `owner`。

## 4. 激励计划规则

### 4.1. 奖励释放规则

每个激励计划 (`incentive`) 内部都维护两个独立的账本：

- **待释放奖励 (`unreleased`)**: 这是由管理员注入的、尚未在时间维度上释放的奖励总池。
- **待领取奖励 (`unsettled`)**: 这是已根据时间线性从 `unreleased` 池释放出来，可供当前所有质押用户根据其份额赚取的奖励池。

激励计划开始后，`unreleased` 账本中的奖励会随着时间的推移，线性地转移到 `unsettled` 账本中。释放速度取决于 `unreleased` 的余额和计划剩余时间。

如果参与激励计划的**活跃流动性**为零，奖励将暂停释放。活跃流动性恢复后奖励释放速度会增长（因为待释放奖励没有减少，但剩余时间减少了）

### 4.2. 参与与结算规则

- 用户可以在激励计划开始前或进行中随时 `stake` 参与。奖励将从 **计划开始时间** 或 **用户质押时间** 中的较晚者开始计算。
- 用户可以在任何时刻 `unstake` 退出。一旦执行 `unstake`，该 `v3token` 在本次质押期间的全部应计奖励会**结算** (`settle`) 到用户的个人奖励账户，等待用户 `claim`。

### 4.3. 盲挖规则

“盲挖”是激励计划的一种特殊初始阶段，其规则如下：

- **奖励计算**: 在盲挖期间，用户的潜在奖励会按正常规则进行计算和累积。
- **提取限制**: 若用户在盲挖期**结束之前**执行 `unstake` 操作，其在此期间累积的所有应得奖励将被作废，并自动返还到该激励计划的 `unreleased` 奖励池中，而不会结算给用户。

## 5. 前端数据获取与计算逻辑

### 5.1. 合约数据接口要点

前端在展示页面数据时，以下数据由合约提供：

- **V3 池列表**: 获取 Staker 系统支持的 V3 Pool 列表的方式，暂不包含在本文档的讨论范围内。
- **激励计划查询**: 可通过合约查询指定 V3 Pool 当前正在进行的激励计划。注意：**已经结束且所有质押都已退出的激励计划会被合约删除**，前端将无法查询到历史信息。
- **用户质押凭证列表**: 可通过合约查询指定地址在特定 V3 Pool 中已 `deposit` 的 `v3token` 列表。此接口有 **256 个** 的数量上限。如果用户存入的 `v3token` 超出此上限，超出部分虽成功存入，但无法通过此接口直接查询。前端需进行相应限制，或考虑通过 `getLogs` 等事件查询方式获取全量数据。
- **质押详情**: 给定 `token_id` 和 `incentive_key`，合约可提供该 `v3token` 在此激励计划中的完整质押信息 (`IncentiveStake`)。
- **凭证详情**: 给定 `token_id`，合约可提供该 `v3token` 的所有者等基础信息 (`UserToken`)。

### 5.2. 实现注意事项

- **逻辑参考**: 具体的计算逻辑可参考伪代码文件 `v3-staker-frontend.py`。该文件仅用于阐述逻辑，并非可直接执行的代码。（该文件可以放在 IDE 中查阅以获得类型标记）
- **数值表示法**: 在与智能合约交互时，必须对数值格式进行精确处理。区块链系统通常使用**大整数 (BigInt)** 来表示定点数（Fixed-Point Number），以规避浮点数运算的精度风险。例如，代币数量常用一个乘以 `10^18` 的整数来表示 `1` 个单位的代币；而 Uniswap 的某些接口可能使用 `2^64` 作为缩放因子（变量名为 `VariableX64`）。实现者必须根据具体接口文档进行相应的数值转换。
- **运算精度**: 在计算 APR (年化收益率) 等衍生指标时，应特别注意运算顺序，**建议优先执行乘法，再执行除法**，以最大限度地减少计算过程中的精度损失。

## 6. 合约接口定义

本章节提供了 V3 Staker 智能合约 (`IUniswapV3Staker`) 的权威接口定义。所有与合约的交互都应以此为准。接口遵循 Solidity 0.7.6 版本规范。

### 6.1 数据结构

#### `IncentiveKey`

用于唯一标识激励计划的核心结构体。在调用与特定激励计划相关的函数时，需要传入此结构体。

| 字段名        | 类型             | 描述                               |
| ------------- | ---------------- | ---------------------------------- |
| `rewardToken` | `IERC20Minimal`  | 奖励分发代币合约地址。             |
| `pool`        | `IUniswapV3Pool` | 关联的 Uniswap V3 池合约地址。     |
| `startTime`   | `uint256`        | 激励计划开始的 Unix 时间戳（秒）。 |
| `endTime`     | `uint256`        | 奖励停止累积的 Unix 时间戳（秒）。 |
| `refundee`    | `address`        | 接收剩余奖励代币的地址。           |

### 6.2 操作接口

以下函数会修改合约状态，调用它们需要发起交易并消耗 Gas。

#### 6.2.1 用户操作接口

```solidity
function depositToken(uint256 tokenId) external;
```
**描述**: 将调用者拥有的 Uniswap V3 LP NFT (`v3token`) 存入 Staker 合约。参与质押活动的前提。调用者必须是 `tokenId` 的所有者，并须授权 Staker 合约转移此 NFT。

**参数**:
* `tokenId` (`uint256`): 需存入的 `v3token` 的唯一 ID。

```solidity
function withdrawToken(uint256 tokenId, address to) external;
```
**描述**: 从合约取回**未被质押**的 `v3token`。

**参数**:
* `tokenId` (`uint256`): 要取回的 `v3token` 的唯一 ID。
* `to` (`address`): 接收 `v3token` 的地址。

```solidity
function stakeToken(IncentiveKey memory key, uint256 tokenId) external;
```
**描述**: 将已存入合约的 `v3token` **质押**到指定激励计划，以赚取奖励。

**参数**:

* `key` (`IncentiveKey`): 目标激励计划的唯一标识结构体。
* `tokenId` (`uint256`): 要质押的 `v3token` 的唯一 ID。

```solidity
function unstakeToken(IncentiveKey memory key, uint256 tokenId) external;
```
**描述**: 从指定激励计划**解押** `v3token`，结算质押期间产生的奖励，并计入用户的待领取余额。

**参数**:

* `key` (`IncentiveKey`): 激励计划的标识结构体。
* `tokenId` (`uint256`): 要解押的 `v3token` 的唯一 ID。

```solidity
function claimReward(
    IERC20Minimal rewardToken,
    address to,
    uint256 amountRequested
) external returns (uint256 reward);
```
**描述**: 提取指定代币的已结算奖励。

**参数**:

* `rewardToken` (`IERC20Minimal`): 要领取的奖励代币的合约地址。
* `to` (`address`): 接收奖励的地址。
* `amountRequested` (`uint256`): 希望领取的数量，`0` 表示领取所有。

**返回值**:

* `reward` (`uint256`): 实际成功领取的奖励数量。

#### 6.2.2 管理员操作接口

```solidity
function createIncentive(IncentiveKey memory key, uint256 reward) external;
```
**描述**: 管理员创建新的激励计划，并注入初始奖励资金。

**参数**:

* `key` (`IncentiveKey`): 新激励计划的定义。
* `reward` (`uint256`): 初始奖励资金总额。

```solidity
function endIncentive(IncentiveKey memory key) external returns (uint256 refund);
```
**描述**: 结束激励计划。`endTime` 已过且所有 `v3token` 解押后，管理员调用。

**参数**:

* `key` (`IncentiveKey`): 要结束的激励计划标识。

**返回值**:

* `refund` (`uint256`): 退还给 `refundee` 的剩余奖励金额。

### 6.3 数据查询函数 (Calls)

以下函数为只读函数，用于获取合约数据，通常不消耗 Gas（通过 `eth_call` 调用）。

**注意！！！**部分接口可能会出现一个或多个特殊调用需求，在接口中有详细介绍。

1. 接口中可能没有 `view` 关键词，SDK 调用方法可能会不一样。（但 RPC 层面是一样的，所以需要和接口组确认）
2. **必须**指定 from 为特殊地址 `0xfe01`

#### 6.3.1 全局与池子信息

```solidity
function getAllIncentiveKeysByPool(address pool)
    external
    view
    returns (IUniswapV3Staker.IncentiveKey[] memory);
```
**描述**: 返回指定 V3 `pool` 地址下所有**未被清理**的激励计划。前端通过此方法发现池内活动。

**参数**:

* `pool` (`address`): Uniswap V3 池的合约地址。

**返回值**:

* 包含所有相关激励计划 `IncentiveKey` 的数组。前端需自行过滤出“进行中”、“未开始”或“已结束”的计划。

```solidity
function getIncentiveRewardInfo(IncentiveKey memory key)
    external
    returns (
        uint256 token0Amount,
        uint256 token1Amount,
        uint96 tokenUnreleased,
        uint96 rewardRate,
        bool isEmpty
    );
```
**描述**: 返回指定 `key` 的激励计划的全局状态。

**注意: ** 【特殊调用需求】接口中没有 `view` 关键字。

**参数**:

* `key` (`IncentiveKey`): 要查询的激励计划标识。

**返回值**:

* `token0Amount` (`uint256`): 当前质押的 `token0` 总量。
* `token1Amount` (`uint256`): 当前质押的 `token1` 总量。
* `tokenUnreleased` (`uint96`): 尚未释放的奖励总量。
* `rewardRate` (`uint96`): 名义的奖励释放速率（单位：token/秒，1 代表  `1 Drip/秒`）。
* `isEmpty` (`bool`): 活跃流动性是否为零。

#### 6.3.2 用户与质押信息

```solidity
function getUserPositions(address user, address pool) external view returns (uint256[] memory);
```
**描述**: 在 `pool` 中存入的所有 `v3token` `tokenId` 数组。

**注意**: 【特殊调用需求】需要设置 `from` 地址为 `0xfe01`。此接口有 **256 个** 的数量上限，超出部分虽成功存入，但无法查询到。

**参数**:

* `user` (`address`): 查询的用户地址。
* `pool` (`address`): 查询的 V3 池地址。

**返回值**:

* 用户在池中存入的 `tokenId` 列表。

```solidity
function deposits(uint256 tokenId)
    external
    view
    returns (
        address owner,
        uint48 numberOfStakes,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    );
```
**描述**: 返回已存入 `tokenId` 的基础信息。（前端可能用不到）

**参数**:

* `tokenId` (`uint256`): 要查询的 `v3token` ID。

**返回值**:

* `owner` (`address`): 凭证当前所有者。
* `numberOfStakes` (`uint48`): 被质押的激励计划数量。
* `tickLower` (`int24`): 流动性区间下边界 tick。
* `tickUpper` (`int24`): 流动性区间上边界 tick。
* `liquidity` (`uint128`): 凭证代表的流动性数量。

```solidity
function getStakeRewardInfo(IncentiveKey memory key, uint256 tokenId)
    external
    returns (
        uint128 liquidity,
        uint128 boostedLiquidity,
        uint128 rewardsPerSecondX32,
        uint96 unsettledReward
    );
```
**描述**: 获取 `tokenId` 在 `key` 激励计划中的奖励信息。

**注意: ** 【特殊调用需求】需要设置 `from` 地址为 `0xfe01`，接口中没有 `view` 关键字

**参数**:

* `key` (`IncentiveKey`): 查询的激励计划标识。
* `tokenId` (`uint256`): 查询的 `v3token` ID。

**返回值**:

* `liquidity` (`uint128`): 仓位的原始流动性。
* `boostedLiquidity` (`uint128`): Boost 后的有效流动性。
* `rewardsPerSecondX32` (`uint128`): 每秒的奖励速率（Q32格式，`2^32` 代表 `1 Drip/秒`）。
* `unsettledReward` (`uint96`): 已产生但未结算的奖励总额。

```solidity
function rewards(address user, IERC20Minimal rewardToken) external view returns (uint256 amountOwed);
```
**描述**: 查询用户可**领取** (claim) 的奖励。

**参数**:

* `user` (`address`): 查询的用户地址。
* `rewardToken` (`IERC20Minimal`): 查询的奖励代币合约地址。

**返回值**:

* `amountOwed` (`uint256`): 用户可领取的奖励代币总量。

#### 6.3.3 配置参数信息

以下函数用于查询合约的全局性、固定或半固定的配置参数。这些参数通常在合约部署时设定，定义了系统的核心依赖和基本规则。

```solidity
function unclaimableEndtime() external view returns (uint256);
```

**描述**: 获取“盲挖期”的结束时间戳。在此时间戳之前执行 `unstakeToken` 操作，用户将丧失该次质押在此期间累积的所有奖励。

**返回值:** 

- 返回一个 Unix 时间戳（秒）。

### 6.4 合约事件

| 事件                      | 描述                                  |
| ------------------------- | ------------------------------------- |
| `IncentiveCreated(...)`   | 新激励计划被创建时触发。              |
| `IncentiveEnded(...)`     | 激励计划结束时触发。                  |
| `DepositTransferred(...)` | 已存入的 `v3token` 所有权转移时触发。 |
| `TokenStaked(...)`        | `v3token` 被质押到激励计划时触发。    |
| `TokenUnstaked(...)`      | `v3token` 从激励计划中解押时触发。    |
| `RewardClaimed(...)`      | 用户领取奖励时触发。                  |

# 附录

## A.`v3-staker-frontend.py` 文件

```python
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
```

## B.合约接口文件

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/interfaces/IERC20Minimal.sol';

import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IMulticall.sol';

/// @title Uniswap V3 Staker Interface
/// @notice Allows staking nonfungible liquidity tokens in exchange for reward tokens
interface IUniswapV3Staker is IERC721Receiver, IMulticall {
    /// @param rewardToken The token being distributed as a reward
    /// @param pool The Uniswap V3 pool
    /// @param startTime The time when the incentive program begins
    /// @param endTime The time when rewards stop accruing
    /// @param refundee The address which receives any remaining reward tokens when the incentive is ended
    struct IncentiveKey {
        IERC20Minimal rewardToken;
        IUniswapV3Pool pool;
        uint256 startTime;
        uint256 endTime;
        address refundee;
    }

    /// @notice The Uniswap V3 Factory
    function factory() external view returns (IUniswapV3Factory);

    /// @notice The nonfungible position manager with which this staking contract is compatible
    function nonfungiblePositionManager() external view returns (INonfungiblePositionManager);

    /// @notice The max duration of an incentive in seconds
    function maxIncentiveDuration() external view returns (uint256);

    /// @notice The max amount of seconds into the future the incentive startTime can be set
    function maxIncentiveStartLeadTime() external view returns (uint256);

    /// @notice The timestamp after which rewards become claimable. Unstaking before this time forfeits rewards.
    function unclaimableEndtime() external view returns (uint256);

    /// @notice Returns information about a deposited NFT
    /// @return owner The owner of the deposited NFT
    /// @return numberOfStakes Counter of how many incentives for which the liquidity is staked
    /// @return tickLower The lower tick of the range
    /// @return tickUpper The upper tick of the range
    /// @return liquidity The liquidity of the deposit
    function deposits(uint256 tokenId)
        external
        view
        returns (
            address owner,
            uint48 numberOfStakes,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity
        );

    /// @notice Returns information about a staked liquidity NFT
    /// @param tokenId The ID of the staked token
    /// @param incentiveId The ID of the incentive for which the token is staked
    /// @return secondsPerLiquidityInsideInitialX128 secondsPerLiquidity represented as a UQ32.128
    /// @return liquidity The amount of liquidity in the NFT as of the last time the rewards were computed
    function getStakeInfo(uint256 tokenId, bytes32 incentiveId)
        external
        view
        returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity);

    /// @notice Returns the amount of a specific reward token owed to a given user.
    /// @dev This is the getter for the public `rewards` state variable, which is a nested mapping.
    /// @param user The address of the user whose rewards are being queried.
    /// @param rewardToken The contract address of the reward token to query.
    /// @return amountOwed The amount of the specified reward token claimable by the user.
    function rewards(address user, IERC20Minimal rewardToken) external view returns (uint256 amountOwed);

    /// @notice Gets all stored (not ended) incentive keys for a given pool.
    /// @dev This function returns all keys that have been added and not yet removed (in an arbitrary sequence),
    ///      regardless of whether their end time has passed.
    /// @param pool The address of the Uniswap V3 pool.
    /// @return A list of all incentive keys that have not been removed.
    function getAllIncentiveKeysByPool(address pool)
        external
        view
        returns (IUniswapV3Staker.IncentiveKey[] memory);

    /**
     * @notice Gets the global state and reward metrics for a specific incentive.
     * @dev A convenience function for RPC calls that returns key metrics about a specific incentive plan.
     * @param key The key that identifies the incentive to query.
     * @return token0Amount The total amount of token0 currently staked in the incentive.
     * @return token1Amount The total amount of token1 currently staked in the incentive.
     * @return tokenUnreleased The total amount of reward tokens that have not yet been released for the incentive.
     * @return rewardRate The nominal rate at which rewards are generated per second (tokens per second).
     * @return isEmpty True if the incentive pool has zero active liquidity, false otherwise.
     */
    function getIncentiveRewardInfo(IncentiveKey memory key)
        external
        returns (
            uint256 token0Amount,
            uint256 token1Amount,
            uint96 tokenUnreleased,
            uint96 rewardRate,
            bool isEmpty
        );

    /// @notice Gets reward information for a staked token.
    /// @dev This is a convenience function for RPC calls and requires a specific sender address (0xfe01) to prevent on-chain execution.
    /// @param key The incentive key.
    /// @param tokenId The ID of the staked token.
    /// @return liquidity The original liquidity of the position.
    /// @return boostedLiquidity The liquidity after applying the boost.
    /// @return rewardsPerSecondX32 The rewards earned per second, as a Q32 fixed-point number.
    /// @return unsettledReward The total unclaimed reward for this position in this incentive.
    function getStakeRewardInfo(IncentiveKey memory key, uint256 tokenId)
        external
        returns (
            uint128 liquidity,
            uint128 boostedLiquidity,
            uint128 rewardsPerSecondX32,
            uint96 unsettledReward
        );

    /// @notice Gets all deposited token IDs for a specific user in a given pool.
    /// @dev This is a convenience function for RPC calls and requires a specific sender address (0xfe01) to prevent on-chain execution.
    /// @dev It reads from the `userTokens` mapping which tracks up to 256 token IDs per user per pool.
    /// @param user The address of the user whose token positions are being queried.
    /// @param pool The address of the pool to query.
    /// @return An array of `uint256` representing the token IDs.
    function getUserPositions(address user, address pool) external view returns (uint256[] memory);

    /// @notice Creates a new liquidity mining incentive program
    /// @param key Details of the incentive to create
    /// @param reward The amount of reward tokens to be distributed
    function createIncentive(IncentiveKey memory key, uint256 reward) external;

    /// @notice Ends an incentive after the incentive end time has passed and all stakes have been withdrawn
    /// @param key Details of the incentive to end
    /// @return refund The remaining reward tokens when the incentive is ended
    function endIncentive(IncentiveKey memory key) external returns (uint256 refund);

    /// @notice Deposits an NFT into the staker contract.
    /// @dev The sender must be the owner of the NFT. The NFT is transferred to this contract.
    /// @param tokenId The ID of the NFT to deposit.
    function depositToken(uint256 tokenId) external;

    /// @notice Withdraws a Uniswap V3 LP token `tokenId` from this contract to the recipient `to`
    /// @param tokenId The unique identifier of an Uniswap V3 LP token
    /// @param to The address where the LP token will be sent
    function withdrawToken(uint256 tokenId, address to) external;

    /// @notice Stakes a Uniswap V3 LP token
    /// @param key The key of the incentive for which to stake the NFT
    /// @param tokenId The ID of the token to stake
    function stakeToken(IncentiveKey memory key, uint256 tokenId) external;

    /// @notice Unstakes a Uniswap V3 LP token
    /// @param key The key of the incentive for which to unstake the NFT
    /// @param tokenId The ID of the token to unstake
    function unstakeToken(IncentiveKey memory key, uint256 tokenId) external;

    /// @notice Transfers `amountRequested` of accrued `rewardToken` rewards from the contract to the recipient `to`
    /// @param rewardToken The token being distributed as a reward
    /// @param to The address where claimed rewards will be sent to
    /// @param amountRequested The amount of reward tokens to claim. Claims entire reward amount if set to 0.
    /// @return reward The amount of reward tokens claimed
    function claimReward(
        IERC20Minimal rewardToken,
        address to,
        uint256 amountRequested
    ) external returns (uint256 reward);

    /// @notice Event emitted when a liquidity mining incentive has been created
    /// @param rewardToken The token being distributed as a reward
    /// @param pool The Uniswap V3 pool
    /// @param startTime The time when the incentive program begins
    /// @param endTime The time when rewards stop accruing
    /// @param refundee The address which receives any remaining reward tokens after the end time
    /// @param reward The amount of reward tokens to be distributed
    event IncentiveCreated(
        IERC20Minimal indexed rewardToken,
        IUniswapV3Pool indexed pool,
        uint256 startTime,
        uint256 endTime,
        address refundee,
        uint256 reward
    );

    /// @notice Event that can be emitted when a liquidity mining incentive has ended
    /// @param incentiveId The incentive which is ending
    /// @param refund The amount of reward tokens refunded
    event IncentiveEnded(bytes32 indexed incentiveId, uint256 refund);

    /// @notice Emitted when ownership of a deposit changes
    /// @param tokenId The ID of the deposit (and token) that is being transferred
    /// @param oldOwner The owner before the deposit was transferred
    /// @param newOwner The owner after the deposit was transferred
    event DepositTransferred(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner);

    /// @notice Event emitted when a Uniswap V3 LP token has been staked
    /// @param tokenId The unique identifier of an Uniswap V3 LP token
    /// @param liquidity The amount of liquidity staked
    /// @param incentiveId The incentive in which the token is staking
    event TokenStaked(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 indexed incentiveId,
        uint128 liquidity,
        uint128 adjustedLiquidity
    );

    /// @notice Event emitted when a Uniswap V3 LP token has been unstaked
    /// @param tokenId The unique identifier of an Uniswap V3 LP token
    /// @param incentiveId The incentive in which the token is staking
    event TokenUnstaked(uint256 indexed tokenId, address indexed owner, bytes32 indexed incentiveId);

    /// @notice Event emitted when a reward token has been claimed
    /// @param to The address where claimed rewards were sent to
    /// @param reward The amount of reward tokens claimed
    event RewardClaimed(address indexed to, uint256 reward);
}
```

## C. ABI 接口文件

```json
{
  "_format": "hh-sol-artifact-1",
  "contractName": "IUniswapV3Staker",
  "sourceName": "contracts/interfaces/IUniswapV3Staker.sol",
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "DepositTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "contract IERC20Minimal",
          "name": "rewardToken",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "contract IUniswapV3Pool",
          "name": "pool",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "refundee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        }
      ],
      "name": "IncentiveCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "incentiveId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "refund",
          "type": "uint256"
        }
      ],
      "name": "IncentiveEnded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        }
      ],
      "name": "RewardClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "incentiveId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint128",
          "name": "liquidity",
          "type": "uint128"
        },
        {
          "indexed": false,
          "internalType": "uint128",
          "name": "adjustedLiquidity",
          "type": "uint128"
        }
      ],
      "name": "TokenStaked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "incentiveId",
          "type": "bytes32"
        }
      ],
      "name": "TokenUnstaked",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "contract IERC20Minimal",
          "name": "rewardToken",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountRequested",
          "type": "uint256"
        }
      ],
      "name": "claimReward",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey",
          "name": "key",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        }
      ],
      "name": "createIncentive",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "depositToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "deposits",
      "outputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint48",
          "name": "numberOfStakes",
          "type": "uint48"
        },
        {
          "internalType": "int24",
          "name": "tickLower",
          "type": "int24"
        },
        {
          "internalType": "int24",
          "name": "tickUpper",
          "type": "int24"
        },
        {
          "internalType": "uint128",
          "name": "liquidity",
          "type": "uint128"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey",
          "name": "key",
          "type": "tuple"
        }
      ],
      "name": "endIncentive",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "refund",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "factory",
      "outputs": [
        {
          "internalType": "contract IUniswapV3Factory",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "pool",
          "type": "address"
        }
      ],
      "name": "getAllIncentiveKeysByPool",
      "outputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey",
          "name": "key",
          "type": "tuple"
        }
      ],
      "name": "getIncentiveRewardInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "token0Amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "token1Amount",
          "type": "uint256"
        },
        {
          "internalType": "uint96",
          "name": "tokenUnreleased",
          "type": "uint96"
        },
        {
          "internalType": "uint96",
          "name": "rewardRate",
          "type": "uint96"
        },
        {
          "internalType": "bool",
          "name": "isEmpty",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "incentiveId",
          "type": "bytes32"
        }
      ],
      "name": "getStakeInfo",
      "outputs": [
        {
          "internalType": "uint160",
          "name": "secondsPerLiquidityInsideInitialX128",
          "type": "uint160"
        },
        {
          "internalType": "uint128",
          "name": "liquidity",
          "type": "uint128"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey",
          "name": "key",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "getStakeRewardInfo",
      "outputs": [
        {
          "internalType": "uint128",
          "name": "liquidity",
          "type": "uint128"
        },
        {
          "internalType": "uint128",
          "name": "boostedLiquidity",
          "type": "uint128"
        },
        {
          "internalType": "uint128",
          "name": "rewardsPerSecondX32",
          "type": "uint128"
        },
        {
          "internalType": "uint96",
          "name": "unsettledReward",
          "type": "uint96"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "pool",
          "type": "address"
        }
      ],
      "name": "getUserPositions",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxIncentiveDuration",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxIncentiveStartLeadTime",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes[]",
          "name": "data",
          "type": "bytes[]"
        }
      ],
      "name": "multicall",
      "outputs": [
        {
          "internalType": "bytes[]",
          "name": "results",
          "type": "bytes[]"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nonfungiblePositionManager",
      "outputs": [
        {
          "internalType": "contract INonfungiblePositionManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "onERC721Received",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "",
          "type": "bytes4"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "contract IERC20Minimal",
          "name": "rewardToken",
          "type": "address"
        }
      ],
      "name": "rewards",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "amountOwed",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey",
          "name": "key",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "stakeToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unclaimableEndtime",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "contract IERC20Minimal",
              "name": "rewardToken",
              "type": "address"
            },
            {
              "internalType": "contract IUniswapV3Pool",
              "name": "pool",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endTime",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "refundee",
              "type": "address"
            }
          ],
          "internalType": "struct IUniswapV3Staker.IncentiveKey",
          "name": "key",
          "type": "tuple"
        },
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "unstakeToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "withdrawToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  "bytecode": "0x",
  "deployedBytecode": "0x",
  "linkReferences": {},
  "deployedLinkReferences": {}
}

```

