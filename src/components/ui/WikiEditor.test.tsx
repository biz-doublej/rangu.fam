import React from 'react'
// import { render, screen, waitFor } from '@testing-library/react'
// import '@testing-library/jest-dom'
import WikiEditor from './WikiEditor'

// Mock the useWikiAuth hook
/*
jest.mock('@/contexts/WikiAuthContext', () => ({
  useWikiAuth: () => ({
    wikiUser: { username: 'testuser', _id: '123' },
    login: jest.fn(),
  }),
}))

// Mock the fetch API
global.fetch = jest.fn()

describe('WikiEditor Document Locking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  }

  test('displays lock warning when document is being edited by another user', async () => {
    // Mock the fetch response for checking lock status
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/wiki/pages/lock')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            isLocked: true,
            lockedBy: 'otheruser',
          }),
        })
      }
      return Promise.resolve({
        json: () => Promise.resolve({}),
      })
    })

    render(
      <WikiEditor
        content="Test content"
        onChange={jest.fn()}
        title="Test Document"
      />
    )

    // Wait for the lock status to be checked
    await waitFor(() => {
      expect(screen.getByText(/이 문서는 otheruser님이 편집 중입니다/)).toBeInTheDocument()
    })

    // Check that the warning message has the correct styling
    const warningMessage = screen.getByText(/이 문서는 otheruser님이 편집 중입니다/)
    expect(warningMessage).toHaveClass('text-red-400')
    expect(warningMessage.closest('div')).toHaveClass('bg-red-900/30')
  })

  test('does not display lock warning when document is not locked', async () => {
    // Mock the fetch response for checking lock status
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/wiki/pages/lock')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            isLocked: false,
          }),
        })
      }
      return Promise.resolve({
        json: () => Promise.resolve({}),
      })
    })

    render(
      <WikiEditor
        content="Test content"
        onChange={jest.fn()}
        title="Test Document"
      />
    )

    // Wait for the lock status to be checked
    await waitFor(() => {
      expect(screen.queryByText(/이 문서는 .*님이 편집 중입니다/)).not.toBeInTheDocument()
    })
  })

  test('does not display lock warning when current user is editing', async () => {
    // Mock the fetch response for checking lock status
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/wiki/pages/lock')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            isLocked: true,
            lockedBy: 'testuser', // Same as current user
          }),
        })
      }
      return Promise.resolve({
        json: () => Promise.resolve({}),
      })
    })

    render(
      <WikiEditor
        content="Test content"
        onChange={jest.fn()}
        title="Test Document"
      />
    )

    // Wait for the lock status to be checked
    await waitFor(() => {
      expect(screen.queryByText(/이 문서는 .*님이 편집 중입니다/)).not.toBeInTheDocument()
    })
  })
})
*/

export {} // Add this to make it a module