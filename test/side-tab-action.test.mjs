/**
 * 侧栏开关按钮的四条状态分支：只验证纯决策，不碰 DOM 与侧栏服务。
 * 运行：node --import ./test/loader.mjs --test test/*.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { sideTabAction } from '../src/core/side-tab-state.js'

test('页签不存在：打开页签', () => {
  assert.equal(sideTabAction({ hasTab: false, expanded: false, active: false }), 'open')
  assert.equal(sideTabAction({ hasTab: false, expanded: true, active: true }), 'open')
})

test('页签存在 + 侧栏展开 + 该页签激活：关闭页签', () => {
  assert.equal(sideTabAction({ hasTab: true, expanded: true, active: true }), 'close')
})

test('页签存在 + 侧栏展开 + 用户切到别的页签：聚焦回批注页签', () => {
  assert.equal(sideTabAction({ hasTab: true, expanded: true, active: false }), 'focus')
})

test('页签存在 + 侧栏收起：先展开再聚焦，不关闭', () => {
  assert.equal(sideTabAction({ hasTab: true, expanded: false, active: false }), 'reveal')
  assert.equal(sideTabAction({ hasTab: true, expanded: false, active: true }), 'reveal')
})

test('输入缺省时按「没有页签」处理，不误关', () => {
  assert.equal(sideTabAction(), 'open')
  assert.equal(sideTabAction({}), 'open')
})
