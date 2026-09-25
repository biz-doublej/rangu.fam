import { describe, expect, it } from 'vitest'
import { getNotificationGroup } from './NotificationContext'

describe('getNotificationGroup', () => {
  it('sorts new categories into their tab', () => {
    expect(getNotificationGroup({ type: 'edit', category: 'document' })).toBe('document')
    expect(getNotificationGroup({ type: 'login', category: 'account' })).toBe('account')
    expect(getNotificationGroup({ type: 'info', category: 'notice' })).toBe('notice')
  })

  it('maps notifications saved before the redesign', () => {
    expect(getNotificationGroup({ type: 'wiki', category: 'wiki' })).toBe('document')
    expect(getNotificationGroup({ type: 'edit' })).toBe('document')
    expect(getNotificationGroup({ type: 'logout' })).toBe('account')
    expect(getNotificationGroup({ type: 'warning', category: 'security' })).toBe('account')
    expect(getNotificationGroup({ type: 'info' })).toBe('notice')
  })
})
