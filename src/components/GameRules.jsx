import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GameRules = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 半透明背景遮罩 */}
          <motion.div
            className="rules-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 规则内容面板 */}
          <motion.div
            className="rules-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            <div className="rules-header">
              <h2>抓红三 - 游戏规则</h2>
              <button className="rules-close" onClick={onClose}>×</button>
            </div>

            <div className="rules-content">
              {/* 基本介绍 */}
              <section className="rules-section">
                <h3>基本介绍</h3>
                <p>抓红三是一种5人扑克牌游戏，使用50张牌（一副牌去掉4个6，含大小王）。持有红3（红桃3或方片3）的玩家为"红三方"，其余为"黑三方"。</p>
              </section>

              {/* 牌组说明 */}
              <section className="rules-section">
                <h3>牌组说明</h3>
                <ul>
                  <li>共50张牌：去掉4个6的一副扑克牌</li>
                  <li>每人发10张牌</li>
                  <li>4种花色：红桃♥、方片♦、黑桃♠、梅花♣</li>
                  <li>特殊牌：大王、小王</li>
                </ul>
              </section>

              {/* 游戏流程 */}
              <section className="rules-section">
                <h3>游戏流程</h3>
                <ol>
                  <li><strong>发牌阶段</strong>：50张牌平均发给5位玩家，每人10张。</li>
                  <li><strong>亮牌阶段</strong>（10秒）：
                    <ul>
                      <li>方片3必须亮出（不可取消）</li>
                      <li>红桃3、黑桃3、梅花3可选择是否亮出</li>
                      <li>亮出红桃3：积分基数+2</li>
                      <li>亮出黑3（黑桃/梅花）：积分基数+1</li>
                      <li>方片3亮出不加分</li>
                    </ul>
                  </li>
                  <li><strong>出牌阶段</strong>：持有红桃5的玩家先出牌，且首轮必须出含红桃5的牌。</li>
                  <li><strong>结算阶段</strong>：一方全部出完时游戏结束。</li>
                </ol>
              </section>

              {/* 牌的大小 */}
              <section className="rules-section">
                <h3>牌的大小</h3>
                <p className="rules-note">
                  大王 &gt; 小王 &gt; 红3（红桃/方片） &gt; 4 &gt; 黑3（黑桃/梅花） &gt; 2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 5
                </p>
                <p className="rules-note" style={{marginTop: '8px', background: 'rgba(231, 76, 60, 0.1)', borderColor: 'rgba(231, 76, 60, 0.3)'}}>
                  注意：红3和4的大小比较特殊，不是按数字顺序
                </p>
                <p className="rules-note" style={{marginTop: '8px', background: 'rgba(241, 196, 15, 0.15)', borderColor: 'rgba(241, 196, 15, 0.5)'}}>
                  <strong>混合规则：</strong>红3和黑3混合组成对子/炸弹时，红3失去优势，整体按黑3计算。如：方片3+黑桃3的对3 &lt; 对4
                </p>
              </section>

              {/* 出牌规则 */}
              <section className="rules-section">
                <h3>牌型规则</h3>
                <div className="rules-cards">
                  <div className="card-type">
                    <span className="type-name">单张</span>
                    <span className="type-desc">任意一张牌</span>
                  </div>
                  <div className="card-type">
                    <span className="type-name">对子</span>
                    <span className="type-desc">两张点数相同的牌</span>
                  </div>
                  <div className="card-type">
                    <span className="type-name">三张炸</span>
                    <span className="type-desc">三张点数相同的牌</span>
                  </div>
                  <div className="card-type">
                    <span className="type-name">四张炸</span>
                    <span className="type-desc">四张点数相同的牌</span>
                  </div>
                  <div className="card-type">
                    <span className="type-name">双红3炸</span>
                    <span className="type-desc">红桃3 + 方片3</span>
                  </div>
                  <div className="card-type">
                    <span className="type-name">王炸</span>
                    <span className="type-desc">大王 + 小王（最大）</span>
                  </div>
                </div>
                <p className="rules-note" style={{background: 'rgba(231, 76, 60, 0.1)', borderColor: 'rgba(231, 76, 60, 0.3)'}}>
                  <strong>注意：</strong>当前版本不支持顺子、连对、飞机、三带一、三带二等牌型
                </p>
              </section>

              {/* 炸弹大小 */}
              <section className="rules-section">
                <h3>炸弹大小</h3>
                <p>炸弹可以压任意非炸弹牌型。炸弹之间的大小：</p>
                <p className="rules-note">
                  王炸 &gt; 双红3炸 &gt; 四张炸（按点数比大小） &gt; 三张炸（按点数比大小）
                </p>
              </section>

              {/* 阵营规则 */}
              <section className="rules-section">
                <h3>阵营划分</h3>
                <div className="rules-win">
                  <div className="win-condition">
                    <span className="condition-icon" style={{background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', border: '2px solid #e74c3c'}}>红</span>
                    <div className="condition-text">
                      <strong>红三方（1-2人）</strong>
                      <p>持有红3（红桃3或方片3）的玩家</p>
                      <p>红桃3玩家积分翻倍（基数×2）</p>
                      <p>方片3玩家正常积分（基数×1）</p>
                    </div>
                  </div>
                  <div className="win-condition">
                    <span className="condition-icon" style={{background: 'rgba(52, 73, 94, 0.2)', color: '#34495e', border: '2px solid #34495e'}}>黑</span>
                    <div className="condition-text">
                      <strong>黑三方（3-4人）</strong>
                      <p>其他不持有红3的玩家</p>
                      <p>正常积分（基数×1）</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 胜负判定 */}
              <section className="rules-section">
                <h3>胜负判定</h3>
                <div className="rules-win">
                  <div className="win-condition">
                    <span className="condition-icon win">胜</span>
                    <div className="condition-text">
                      <strong>获胜条件（需同时满足）</strong>
                      <p>1. 本方有玩家第一个出完所有手牌</p>
                      <p>2. 本方所有玩家都出完手牌</p>
                      <p>3. 对方还有玩家手中有牌</p>
                    </div>
                  </div>
                  <div className="win-condition">
                    <span className="condition-icon draw">平</span>
                    <div className="condition-text">
                      <strong>平局条件</strong>
                      <p>一方第一个出完，但另一方所有人比该方剩余玩家先出完</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 积分规则 */}
              <section className="rules-section">
                <h3>积分计算</h3>
                <h4 style={{marginBottom: '8px', color: '#2c3e50'}}>基础积分（亮牌阶段）</h4>
                <div className="rules-score">
                  <div className="score-rule">
                    <span className="rule-label">初始基数</span>
                    <span className="rule-value">1分</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">亮红桃3</span>
                    <span className="rule-value red">基数+2</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">亮黑3</span>
                    <span className="rule-value">基数+1</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">亮方片3</span>
                    <span className="rule-value">不加分（必须亮出）</span>
                  </div>
                </div>
                <h4 style={{marginTop: '16px', marginBottom: '8px', color: '#2c3e50'}}>附加积分（游戏结束时）</h4>
                <div className="rules-score">
                  <div className="score-rule">
                    <span className="rule-label">红三方输</span>
                    <span className="rule-value">方片3有牌+1，红桃3有牌+2</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">黑三方输</span>
                    <span className="rule-value">每个有牌的黑三方玩家+1</span>
                  </div>
                </div>
                <h4 style={{marginTop: '16px', marginBottom: '8px', color: '#2c3e50'}}>结算规则</h4>
                <div className="rules-score">
                  <div className="score-rule">
                    <span className="rule-label">红桃3玩家</span>
                    <span className="rule-value red">(基数+附加)×2×输赢</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">方片3玩家</span>
                    <span className="rule-value">(基数+附加)×1×输赢</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">黑三方玩家</span>
                    <span className="rule-value">(基数+附加)×1×输赢</span>
                  </div>
                  <div className="score-rule">
                    <span className="rule-label">平局</span>
                    <span className="rule-value">不计分</span>
                  </div>
                </div>
                <p className="rules-example">
                  <strong>示例：</strong>亮出红桃3后基数为3，黑三方获胜且红桃3玩家手中有牌：附加分+2，总基数=5。红桃3玩家-10分，方片3玩家-5分，黑三方每人+5分
                </p>
              </section>

              {/* 特殊规则 */}
              <section className="rules-section">
                <h3>其他规则</h3>
                <ul>
                  <li>持有红桃5的玩家先出牌</li>
                  <li>首轮出牌必须包含红桃5</li>
                  <li>当所有人都"不要"时，最后出牌的玩家获得新一轮出牌权</li>
                  <li>只能出相同牌型且更大的牌，或者出炸弹</li>
                </ul>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default GameRules
