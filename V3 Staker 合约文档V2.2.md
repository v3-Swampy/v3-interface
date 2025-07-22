# V3 Staker 合约文档 V2.2

[TOC]

## 1. 引言

本文档旨在为 V3 Staker 系统的相关开发、产品及运营人员提供一份统一的参考标准。通过对核心概念、交互流程、关键规则及数据接口的清晰定义，确保各方对系统有共同的理解。

## 2. 核心概念定义

为确保用语的精确与统一，定义以下核心概念：

| 中文术语              | 英文术语               | 定义                                                         |
| --------------------- | ---------------------- | ------------------------------------------------------------ |
| **V3 池**             | `pool`                 | 指一个 Uniswap V3 流动性池。                                 |
| **V3 流动性质押凭证** | `v3token` / `position` | 代表用户在某个 V3 池中的一个具体流动性仓位 (position) 的非同质化代币 (NFT)。它包含了池地址 (`pool`)、所有者 (`owner`)、价格区间 (`tickLower`, `tickUpper`) 和流动性数量 (`liquidity`) 等关键信息。一个 `v3token` 与一个 V3 池唯一对应。 |
| **激励计划**          | `incentive`            | 一项为特定 V3 池的流动性提供者设计的奖励活动。其核心属性包括：关联的 V3 池 (`pool`)、奖励代币 (`reward token`)、计划开始时间 (`start time`)、结束时间 (`end time`) 以及创建者 (`owner`)。创建者拥有在计划结束后，回收所有未发放奖励的权限。 |
| **活跃流动性**        | `active liquidity`     | 所有价格区间 (`tickLower`, `tickUpper`) 覆盖当前价格的 `v3token` 的流动性总和。 |
| **存入**              | `deposit`              | 用户将持有的 `v3token` 存入 Staker 合约的过程。这是参与任何激励计划的前提。 |
| **取出**              | `withdraw`             | 用户从 Staker 合约中取回其 `v3token` 的过程。只有当一个 `v3token` 未质押在任何激励计划中时，该操作才可执行。 |
| **质押**              | `stake`                | 用户将一个已经**存入** (`deposit`) Staker 合约的 `v3token`，质押到一个具体的**激励计划** (`incentive`) 中以赚取奖励的过程。 |
| **解押**              | `unstake`              | 用户将其 `v3token` 从一个**激励计划** (`incentive`) 中退出的过程。 |
| **结算**              | `settle`               | 在用户执行**解押** (`unstake`) 操作时，系统**结算**用户在此次质押期间应获得的奖励总额，并将其记录到用户的个人奖励账户中。 |
| **领取**              | `claim`                | 用户提取其个人奖励账户中已**结算** (`settle`) 奖励的操作。   |

**提醒：** 合约逻辑和前端逻辑不完全相同，前端替用户隐藏了一些合约逻辑的细节，不要使用合约逻辑去理解前端逻辑，详见章节 3.3. 

## 3. 合约交互流程

### 3.1. 用户交互步骤

用户的核心操作路径如下（合约操作流程而非产品逻辑）：

1. **获取凭证**: 用户首先在 Uniswap V3 协议中提供流动性，从而获得一个代表其流动性仓位的 `v3token`。
2. **存入 Staker**: 用户调用 `deposit` 接口，将 `v3token` 存入 Staker 合约中。此时 `v3token` 由 Staker 合约保管。
3. **参与激励**: 对于已经存入的 `v3token`，用户可以选择一个有效的 `incentive` (激励计划)，并调用 `stake` 接口将该 `v3token` 质押进去，开始赚取奖励。**同一个 `v3token` 可以同时参与多个激励计划。**
4. **退出激励**: 用户可在任何时刻调用 `unstake` 接口，将其 `v3token` 从激励计划中解押。此时，系统会立即为其**结算** (`settle`) 应得奖励。
5. **取回凭证**: 对于一个未质押在任何激励计划中的 `v3token`，用户可以调用 `withdraw` 接口，将其从 Staker 合约中完全取回。
6. **领取奖励**: 用户可以随时调用 `claim` 接口，提取其名下所有已结算的奖励。

### 3.2. 管理员交互流程

管理员负责激励计划的生命周期管理：

1. **创建计划**: 管理员调用接口创建 `incentive`，需指定关联的 V3 Pool、奖励代币、起止时间，并提供初始奖励资金。同一个 V3 Pool 最多可以同时存在 **256** 个奖励计划。
2. **管理奖励**: 在激励计划进行期间，管理员可以增加或减少 `unreleased` (待释放) 的奖励金。但**无法**触及已进入 `unsettled` (待结算) 池的奖励。
3. **结束计划**: 当激励计划到期，且所有参与该计划的 `v3token` 都已解押 (`unstake`) 后，管理员可以最终结束该计划，并将 `unreleased` 账本中所有剩余的奖励退还给计划的 `owner`。

### 3.3. 与前端逻辑的差异

#### 3.3.1. 术语命名与操作流程

前端界面封装并简化了合约操作，导致前端术语与合约的实际定义存在差异。

| 前端术语               | 用户视角的操作目标                                           | 对应的合约层操作序列 (Contract-level Action Sequence)        |
| :--------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **`claim` (领取奖励)** | 在不取回质押凭证 (`v3token`) 的情况下，领取当前已赚取的奖励。`v3token` 保持质押状态。 | 复合操作：<br>1. **`unstake()`**: 解押 `v3token`，触发奖励**结算** (`settle`)。<br>2. **`stake()`**: 立即将 `v3token` 重新质押。 |
| **`unstake` (解押)**   | 彻底退出质押，停止赚取奖励，并从 Staker 合约中取回 `v3token`。 | 复合操作：<br>1. **`unstake()`**: 从所有激励计划中解押 `v3token`，触发最终奖励**结算** (`settle`)。<br>2. **`claim()`**: 提取所有已结算的奖励至用户钱包。<br>3. **`withdraw()`**: 从 Staker 合约取回 `v3token`。 |

**差异总结：**

1.  **操作合并**: 前端将合约的 `unstake`, `settle`, `claim`, `withdraw` 等独立功能，合并为面向用户的“领取奖励”或“解押”两个操作。
2.  **状态隐藏**: 合约中存在“已结算未领取”的奖励状态。前端通过在解押后自动执行领取，隐藏了此中间状态，用户仅感知到“累积中”和“已到账”两种状态。
3.  **无缝领取**: 前端通过“先解押再质押”的组合操作，实现了合约不直接支持的“不中断质押并领取奖励”的功能。

#### 3.3.2.  激励计划的自动管理

为简化用户操作，前端将复杂的“激励计划”概念完全对用户隐藏，并进行自动化管理。

*   **对用户透明**
    在前端界面上，用户看不见、也无需选择或手动参与任何具体的激励计划 (`incentive`)，亦无从知晓激励计划是有固定周期的。用户的操作对象始终是自己的流动性质押凭证 (`v3token`)。

*   **质押操作自动化**
    当用户质押一个 `v3token` 时，前端会自动将该凭证 `stake` 到所有当前可参与的、有效的激励计划中，以最大化用户的潜在收益。

*   **管理员权限与安全性**
    管理员有权为用户已存入的 `v3token` 添加新的激励计划，或退出已经结束的激励计划。此操作是安全的，因为它只会增加用户的奖励来源，不会引入任何风险或造成本金损失。

*   **统一收益展示**
    前端会将所有底层激励计划产生的奖励进行聚合，向用户展示一个统一的、总的年化收益率 (APR) 和奖励数额，而非多个独立的收益来源。

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

## 5. 激励模型

本章将通过形式化的定义与数学公式，精确描述 V3 Staker 系统的核心激励机制。内容将关注机制的模型设计，而非其底层算法实现。

### 5.1. 奖励释放模型

每个**激励计划 (`incentive`)** 的奖励代币都遵循一个与时间及**活跃流动性 (`active liquidity`)** 相关的动态释放模型。

在任意时间点 $t$（其中 $t_{start} \le t < t_{end}$），系统的瞬时奖励率 $R(t)$（单位：奖励代币/秒）由当前**待释放奖励 (`unreleased`)** 的总量 $U(t)$ 和激励计划的剩余时间决定。（其中，$t_{start}, t_{end}$ 分别代表激励计划的开始和结束时间。）

$$
R(t) = \frac{U(t)}{t_{end} - t}
$$

特别地，若池内总**活跃有效流动性（active liquidity）**为零，则释放暂停，待释放的 $U(t)$ 会保持不变，并在流动性恢复后因为剩余时间变少以更高的 $R(t)$ 加速释放。

### 5.2. 质押权重与激励加速 (Boosting)

用户的奖励份额并非仅由其 **V3 流动性质押凭证 (`v3token`)** 的原始流动性 (`liquidity`) 决定，而是由一个经 `Voting Escrow` 权重加速后的**有效流动性 (Boosted Liquidity)** 决定。

#### 5.2.1. Voting Escrow 权重

`Voting Escrow` (ve) 是一个独立的治理代币质押系统，用户通过锁定治理代币获得一个投票余额 `voting balance`，作为其对协议长期价值承诺的量化体现。

*   令 $V$ 为特定用户的 `voting balance`。
*   令 $\tilde{V}$ 为全市场 `voting balance` 的总和。

治理代币质押机制复用已有的设计，不在本文的关注范围以内。

#### 5.2.2. 有效流动性计算

对于一个提供原始流动性为 $L$ 的用户，其最终用于计算奖励的有效流动性 $L_{boosted}$ 受其自身流动性及 ve 权重的双重影响，其计算结果如下：

$$
L_{boosted} = L \cdot\min \left(r, 1 + \frac{V/\tilde{V}}{L/\tilde{L}} \cdot (r-1)\right)
$$

其中：
*   $L$ 是用户 `v3token` 的原始流动性。
*   $\tilde{L}$ 是用户**质押 (`stake`)** 后，该激励计划中所有仓位的原始流动性总和。
*   $r\ge 1$ 是系统参数，代表最大加速比率。

该公式的直观解释是：当用户不获取 boost 加速时，$L_{boosted}$ 等于原始流动性；当用户的 `voting balance` 的全局占比高于 `liquidity` 的全局占比时，$L_{boosted}$ 获得 $r$ 倍最大加速。

代码实现与此公式等价，但有以下差异：

1. 代码中系统参数通过 $k=\frac{100}{r}$ 指定，一般取 $k=33$.
2. 代码中实际计算的 $L_{boosted}$ 是公式的 $1/r$, 即 $L_{boosted}=L$ 代表最大加速，$L_{boosted}=L/r$ 代表没有加速。这不影响奖励的计算。

**注意：** 有效流动性的计算仅与“质押时刻”的相关参数有关，一旦完成**质押（stake）**，即使相关计算参数发生变化，也不会更新加速后流动性的值。只有进行**解押（unstake）** 后重新**质押（stake）**的操作才能更新这一参数。

### 5.3. 个人奖励结算

用户的最终奖励，是在其**质押 (`stake`)** 期间，按其有效流动性占池内总活跃有效流动性的比例，对该时段内释放的总奖励进行持续分配的结果。

当用户执行**解押 (`unstake`)** 操作时，其从质押时刻 $t_{stake}$ 到解押时刻 $t_{unstake}$ 所获得的奖励总量 $\text{Reward}_{user}$，可通过以下积分公式精确定义：

$$
\text{Reward} = \int_{t_{stake}}^{t_{unstake}} R(\tau) \cdot \frac{L_{boosted}}{\tilde{L}_{active}(\tau)} \cdot I(\tau) \,d\tau
$$

其中：
*   $R(\tau)$ 是在 $\tau$ 时刻的瞬时奖励率。
*   $L_{boosted}$ 是该用户仓位的有效流动性。
*   $\tilde{L}_{active}(\tau)$ 是在 $\tau$ 时刻，池中所有处于活跃状态的仓位的有效流动性（加速后流动性）总和。
*   $I(\tau)$ 是一个指示函数：当用户的仓位在 $\tau$ 时刻处于**活跃流动性**状态时，$I(\tau)=1$；否则为 $0$。

这个公式确保了奖励只在用户提供有效价值（即仓位处于活跃区间）时进行累积，并精确地按照其贡献比例（由 $L$ 体现）进行分配。

### 5.4. 年化收益率 (APR) 的策略相关性说明

年化收益率 (APR) 是一个高度动态且与个人策略密切相关的预估指标，并非所有参与者共享一个统一的数值。其核心原因在于 Uniswap V3 的流动性机制。

#### 5.4.1. 流动性与资金效率

在 Uniswap V3 中，`liquidity` (L) 与投入的*资本*（TVL，即代币数量）和*价格区间的宽度* **两个因素**相关。对于一个给定的 TVL，价格区间 (`tickLower`, `tickUpper`) 越窄，其对应的 `liquidity` 值就越高。而本激励机制的奖励是围绕 `liquidity`（经过加速后为 $L_{boosted}$）进行计算的，因为 `liquidity` 才是衡量对市场流动性贡献的参数。

#### 5.4.2. APR 的策略权衡

流动性提供者通过不同的策略可以获得不同的 APR，但更高的 APR 会带来其他的不利因素，需要提供者进行策略权衡：

*   **高 APR 策略（窄区间）**:
    *   **优势**: 在价格区间内，用同样多的资金可以获得更高的 `liquidity`，从而在奖励计算中占据更大权重，获得更高的瞬时 APR。
    *   **风险**: 市场价格极易偏离狭窄的区间。一旦偏离，该仓位将变为非**活跃流动性**，其奖励累积会立即停止（即该时段 APR 为 0）。如果流动性提供者通过频繁调仓来保持流动性的活跃，则可能获得更高的“无常损失”。（注：Uniswap 所说的“无常损失”并不是财务意义上的无常损失，只是一个 Defi 行业的普遍误用。这里我们只能沿用这种误用。）
*   **稳健 APR 策略（宽区间）**:
    *   **优势**: 仓位能覆盖更宽的价格波动范围，保持**活跃**状态的时间可能更长，从而更稳定地获得奖励。
    *   **风险**: 同样资金量对应的 `liquidity` 较低，导致在奖励分配中的权重偏低，瞬时 APR 不及窄区间策略。

#### 5.4.3. 前端展示策略

鉴于 APR 与策略高度相关，对于一个激励计划如何在前端展示全局 APR，合约、产品、前端团队曾经进行了长时间的讨论，最终结论为展示当前有效流动性的实际 APR 值，即基于 $R(\tau) / \tilde{L}_{active}(\tau)$ 计算。

## 6. 前端数据获取与计算逻辑

### 6.1. 合约数据接口要点

前端在展示页面数据时，以下数据由合约提供：

- **V3 池列表**: 获取 Staker 系统支持的 V3 Pool 列表的方式，暂不包含在本文档的讨论范围内。
- **激励计划查询**: 可通过合约查询指定 V3 Pool 当前正在进行的激励计划。注意：**已经结束且所有质押都已退出的激励计划会被合约删除**，前端将无法查询到历史信息。
- **用户质押凭证列表**: 可通过合约查询指定地址在特定 V3 Pool 中已 `deposit` 的 `v3token` 列表。此接口有 **256 个** 的数量上限。如果用户存入的 `v3token` 超出此上限，超出部分虽成功存入，但无法通过此接口直接查询。前端需进行相应限制，或考虑通过 `getLogs` 等事件查询方式获取全量数据。
- **质押详情**: 给定 `token_id` 和 `incentive_key`，合约可提供该 `v3token` 在此激励计划中的完整质押信息 (`IncentiveStake`)。
- **凭证详情**: 给定 `token_id`，合约可提供该 `v3token` 的所有者等基础信息 (`UserToken`)。

### 6.2. 实现注意事项

- **逻辑参考**: 具体的计算逻辑可参考伪代码文件 `v3-staker-frontend.py`。该文件仅用于阐述逻辑，并非可直接执行的代码。（该文件可以放在 IDE 中查阅以获得类型标记）
- **数值表示法**: 在与智能合约交互时，必须对数值格式进行精确处理。区块链系统通常使用**大整数 (BigInt)** 来表示定点数（Fixed-Point Number），以规避浮点数运算的精度风险。例如，代币数量常用一个乘以 `10^18` 的整数来表示 `1` 个单位的代币；而 Uniswap 的某些接口可能使用 `2^64` 作为缩放因子（变量名为 `VariableX64`）。实现者必须根据具体接口文档进行相应的数值转换。
- **运算精度**: 在计算 APR (年化收益率) 等衍生指标时，应特别注意运算顺序，**建议优先执行乘法，再执行除法**，以最大限度地减少计算过程中的精度损失。

## 7. 合约接口定义

本章节提供了 V3 Staker 智能合约 (`IUniswapV3Staker`) 的权威接口定义。所有与合约的交互都应以此为准。接口遵循 Solidity 0.7.6 版本规范。

### 7.1 数据结构

#### 7.1.1 `IncentiveKey`

用于唯一标识激励计划的核心结构体。在调用与特定激励计划相关的函数时，需要传入此结构体。

| 字段名        | 类型             | 描述                               |
| ------------- | ---------------- | ---------------------------------- |
| `rewardToken` | `IERC20Minimal`  | 奖励分发代币合约地址。             |
| `pool`        | `IUniswapV3Pool` | 关联的 Uniswap V3 池合约地址。     |
| `startTime`   | `uint256`        | 激励计划开始的 Unix 时间戳（秒）。 |
| `endTime`     | `uint256`        | 奖励停止累积的 Unix 时间戳（秒）。 |
| `refundee`    | `address`        | 接收剩余奖励代币的地址。           |

### 7.2 操作接口

以下函数会修改合约状态，调用它们需要发起交易并消耗 Gas。

#### 7.2.1 用户操作接口

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

#### 7.2.2 管理员操作接口

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

### 7.3 数据查询函数 (Calls)

以下函数为只读函数，用于获取合约数据，通常不消耗 Gas（通过 `eth_call` 调用）。

**注意！！！**部分接口可能会出现一个或多个特殊调用需求，在每个接口中有详细介绍。可能的要求包括：

1. 接口中可能没有 `view` 关键词，SDK 调用方法可能会不一样。（但 RPC 层面是一样的，需要和接口组确认）
2. **必须**指定 from 为特殊地址 `0xfe01`

#### 7.3.1 全局与池子信息

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

#### 7.3.2 用户与质押信息

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
**描述**: 返回已存入 `tokenId` 的基础信息。

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

#### 7.3.3 配置参数信息

以下函数用于查询合约的全局性、固定或半固定的配置参数。这些参数通常在合约部署时设定，定义了系统的核心依赖和基本规则。

```solidity
function unclaimableEndtime() external view returns (uint256);
```

**描述**: 获取“盲挖期”的结束时间戳。在此时间戳之前执行 `unstakeToken` 操作，用户将丧失该次质押在此期间累积的所有奖励。

**返回值:** 

- 返回一个 Unix 时间戳（秒）。

### 7.4 合约事件

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
    # 接口函数：
    #     - getAllIncentiveKeysByPool 获得 IncentiveKey 列表
    #     - getIncentiveRewardInfo 获得 Incentive
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
    # 接口函数：
    #     - getUserPositions 获得 TokenID 列表
    #     - deposits 获得 UserToken
    tokens: Dict[TokenID, UserToken]

    # 用户的质押详情。每一个 token 可能 stake 在多个 Incentive 中。
    # 结构: { tokenID -> { incentiveKey -> IncentiveStake } }
    # 接口函数：
    #     - getUserPositions 获得 TokenID 列表
    #     - getAllIncentiveKeysByPool 获得 IncentiveKey 列表
    #     - getStakeRewardInfo 获得 IncentiveStake
    stakes: Dict[TokenID, Dict[IncentiveKey, IncentiveStake]]

    def totalSupplyForToken(self, tokenId: TokenID) -> float:
        """[前端展示数据] 计算用户单个动性头寸的价值。"""
        
        token = self.tokens[tokenId]
        return token.token0Amount() * self.token0Price + token.token1Amount() * self.token1Price

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
            if self.isStakeActice(key, tokenId):
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
    def allClaimable(self) -> Dict[Address, int]:
        """[前端展示数据] 汇总用户在该池中所有头寸的全部待领取奖励。"""
        totalClaimable: Dict[Address, int] = dict()

        for tokenId in self.tokens.keys():
            claimableForTokenMap = self.claimableForToken(tokenId)
            
            for address, amount in claimableForTokenMap.items():
                # 累加到总的字典中
                totalClaimable[address] = totalClaimable.get(address, 0) + amount
                
        return totalClaimable
    
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
        # 这里乘 3 的原因参见文档 V2.1 章节 5.2.2
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

