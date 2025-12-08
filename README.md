# 捉红3 - 五人在线纸牌游戏

<div align="center">
  <h3>♥♠ 捉红3 ♦♣</h3>
  <p>一款支持单人/多人的H5在线纸牌游戏</p>
</div>

## 🌐 在线访问

- **游戏地址**: https://catch-red-three.vercel.app
- **后端服务**: https://catch-red-three-production.up.railway.app
- **代码仓库**: https://github.com/wulalasheep/catch-red-three

## 🚀 更新部署

修改代码后，执行以下命令即可自动部署到线上：

```bash
cd /Users/zhangxj/Downloads/抓红三/抓红三
git add -A
git commit -m "更新说明"
git push
```

推送后，Vercel（前端）和 Railway（后端）会自动检测并重新部署（约1-2分钟）。

### 查看部署状态
- Vercel 控制台: https://vercel.com/dashboard
- Railway 控制台: https://railway.app/dashboard

### 环境变量配置

| 平台 | 变量名 | 值 |
|------|--------|-----|
| Vercel (前端) | `VITE_SOCKET_URL` | https://catch-red-three-production.up.railway.app |
| Railway (后端) | `NODE_ENV` | production |
| Railway (后端) | `PORT` | 3002 |
| Railway (后端) | `FRONTEND_URL` | https://catch-red-three.vercel.app |

## 📖 游戏简介

捉红3是一款五人纸牌游戏，使用一副54张扑克牌（含大小王），每人发10张牌，剩余4张弃掉。游戏核心是**红三方（持有红桃3或方片3的玩家）** vs **黑三方（其他玩家）**的对抗。

## 🎮 游戏规则

### 基本规则

| 规则 | 说明 |
|------|------|
| 玩家数量 | 5人 |
| 牌数 | 每人10张，弃4张 |
| 队伍划分 | 红三方（持红桃3/方片3）vs 黑三方（其他人） |
| 首家出牌 | 持红桃5的玩家 |
| 获胜条件 | 一方所有玩家先出完手牌 |

### 牌型规则

| 牌型 | 说明 | 示例 |
|------|------|------|
| 单张 | 一张牌 | 5♥ |
| 对子 | 两张点数相同的牌 | 7♠7♣ |
| 三张炸 | 三张点数相同的牌 | KKK |
| 四张炸 | 四张点数相同的牌 | 8888 |
| 双红3炸 | 红桃3+方片3 | 3♥3♦ |
| 双王炸 | 大王+小王 | 🃏🃏 |

### 牌大小排序

```
单张: 大王 > 小王 > 红3 > 4 > 黑3 > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 5
炸弹: 双王炸 > 双红3炸 > 四张炸 > 三张炸
```

> ⚠️ 注意：红桃3和方片3大小相同；黑桃3和梅花3大小相同

### 出牌规则

1. **同类型比较**：单张打单张，对子打对子，炸弹打炸弹
2. **炸弹优先**：炸弹可以打任何非炸弹牌型
3. **大炸打小炸**：更大的炸弹可以打较小的炸弹
4. **轮次规则**：
   - 当所有其他玩家都"不要"时，本轮结束
   - 下一轮由最后出牌的玩家先出
   - 如果该玩家已出完牌，则由其右边第一个有牌的玩家先出

### 特殊规则

- 玩家出完手牌后自动跳过
- 出完牌的玩家最后一手牌如果无人接，下一轮由其右边有牌的玩家开始

## 🛠️ 技术栈

### 前端
- **React 18** - UI框架
- **Vite 5** - 构建工具
- **Framer Motion** - 动画库
- **Socket.io-client** - 实时通信

### 后端（多人模式）
- **Node.js + Express** - 服务器
- **Socket.io** - WebSocket通信
- **UUID** - 房间ID生成

## 📁 项目结构

```
抓红三/
├── src/
│   ├── components/           # React组件
│   │   ├── Card.jsx         # 卡片组件
│   │   ├── Hand.jsx         # 手牌组件
│   │   ├── Player.jsx       # 玩家组件
│   │   ├── GameBoard.jsx    # 游戏主界面（单人）
│   │   ├── GameLog.jsx      # 游戏日志
│   │   ├── MultiplayerLobby.jsx  # 多人大厅
│   │   └── OrientationPrompt.jsx # 横屏提示
│   ├── hooks/
│   │   ├── useGame.js       # 单人游戏逻辑
│   │   └── useMultiplayer.js # 多人游戏连接
│   ├── game/
│   │   ├── deck.js          # 牌组定义和工具函数
│   │   ├── rules.js         # 出牌规则判断
│   │   └── ai.js            # AI出牌逻辑
│   ├── styles/
│   │   └── game.css         # 样式文件
│   ├── App.jsx              # 应用入口
│   └── main.jsx             # React入口
├── server/
│   ├── index.js             # 服务器入口
│   └── package.json         # 服务器依赖
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 快速开始

### 安装依赖

```bash
# 前端依赖
npm install

# 服务器依赖（多人模式需要）
cd server && npm install
```

### 启动项目

#### 单人模式（只需前端）

```bash
npm run dev
# 访问 http://localhost:5173
```

#### 多人模式（需要前端+服务器）

```bash
# 终端1 - 启动服务器
cd server
npm start
# 服务器运行在 http://localhost:3002

# 终端2 - 启动前端
npm run dev
# 前端运行在 http://localhost:5173
```

### 构建生产版本

```bash
npm run build
```

## 🎯 游戏模式

### 单人模式
- 与4个AI电脑对战
- 无需服务器
- 完整的游戏规则实现

### 多人模式
- 创建房间或加入房间
- 支持2-5个真人玩家
- 不足5人时AI自动补位
- 实时游戏状态同步

## 📱 移动端适配

- ✅ 横屏模式优化
- ✅ iPhone X及以上安全区域适配
- ✅ 触摸操作优化
- ✅ 响应式布局

## 🔧 核心文件说明

### `src/game/deck.js`
定义牌的数据结构、花色、大小排序等基础配置。

```javascript
// 花色定义
export const SUITS = {
  HEART: 'heart',     // 红桃
  DIAMOND: 'diamond', // 方片
  SPADE: 'spade',     // 黑桃
  CLUB: 'club',       // 梅花
  JOKER: 'joker'      // 王
}

// 牌大小计算
export const getRankValue = (card) => { ... }
```

### `src/game/rules.js`
出牌规则判断，包括牌型识别和比较。

```javascript
// 牌型定义
export const CARD_TYPES = {
  SINGLE: 'single',       // 单张
  PAIR: 'pair',           // 对子
  BOMB_THREE: 'bomb3',    // 三张炸
  BOMB_FOUR: 'bomb4',     // 四张炸
  BOMB_RED3: 'bombRed3',  // 双红3炸
  BOMB_JOKER: 'bombJoker' // 双王炸
}

// 判断能否打过
export const canBeat = (newCards, lastPlay) => { ... }
```

### `src/game/ai.js`
AI出牌策略实现。

```javascript
// AI选择出牌
export const aiSelectPlay = (hand, lastPlay, isFirstRound) => { ... }
```

### `src/hooks/useGame.js`
单人游戏的状态管理，包括：
- 发牌逻辑
- 回合管理
- 出牌验证
- 胜负判定

### `src/hooks/useMultiplayer.js`
多人游戏连接管理，包括：
- Socket连接
- 房间创建/加入
- 游戏状态同步

### `server/index.js`
多人游戏服务器，包括：
- 房间管理
- 玩家连接
- 游戏状态广播
- AI补位逻辑

## 🐛 已知问题和待优化

### 待优化
- [ ] 多人模式左右两侧玩家布局微调
- [ ] 手牌过多时的显示优化
- [ ] 断线重连机制
- [ ] 游戏记录保存

### 已实现
- [x] 单人模式完整游戏流程
- [x] 多人模式基础框架
- [x] 移动端横屏适配
- [x] 卡牌样式美化
- [x] 游戏日志记录
- [x] 正确的出牌规则判断
- [x] 回合和轮次管理
- [x] 队伍胜负判定

## 📝 更新日志

### v1.0.0 (2024-12)
- 初始版本发布
- 单人模式完整实现
- 多人模式基础框架
- 移动端适配

## 📄 License

MIT License

---

<div align="center">
  <p>Made with ❤️</p>
</div>
