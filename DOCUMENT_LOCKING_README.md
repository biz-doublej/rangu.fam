# Document Locking System

## Overview

The Document Locking System is a feature implemented in the Rangu.fam wiki to prevent conflicts when multiple users edit the same document simultaneously. This system ensures data integrity and provides a better user experience by notifying users when a document is currently being edited by another user.

## Features

1. **Automatic Lock Acquisition**: When a user starts editing a document, the system automatically acquires a lock on that document.
2. **Lock Status Checking**: When another user tries to access the same document, the system checks the lock status and displays a warning message.
3. **Lock Renewal**: The lock is renewed when the user saves the document.
4. **Automatic Lock Release**: Locks are automatically released after 10 minutes of inactivity or when the user leaves the page.
5. **Manual Lock Release**: Users can manually release locks when they finish editing.

## Technical Implementation

### Database Schema

The document locking information is stored in the `WikiPage` schema with the following fields:

```javascript
editLock: {
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: String }, // Username of the editor
  lockedById: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
  lockStartTime: { type: Date },
  lockExpiry: { type: Date }, // Auto-release time (10 minutes after lock)
  lockReason: { type: String, default: 'editing' }
}
```

### API Endpoints

The following API endpoints are available for document lock management:

1. **GET /api/wiki/pages/lock?title={title}**
   - Check the lock status of a document
   - Returns lock information if the document is locked

2. **POST /api/wiki/pages/lock**
   - Acquire a lock on a document
   - Request body: `{ title: "Document Title" }`
   - Returns success status and lock information

3. **PUT /api/wiki/pages/lock**
   - Renew an existing lock (when saving)
   - Request body: `{ title: "Document Title" }`
   - Extends the lock expiry time

4. **DELETE /api/wiki/pages/lock?title={title}**
   - Release a lock on a document
   - Available to the lock owner or administrators

### Frontend Implementation

The document locking system is implemented in the `WikiEditor` component with the following features:

1. **Lock Status Checking**: When a document is opened, the system checks if it's locked by another user.
2. **Lock Acquisition**: When a user starts editing, the system attempts to acquire a lock.
3. **Periodic Lock Checking**: The system checks the lock status every 30 seconds.
4. **Lock Renewal**: When a user saves the document, the lock is renewed.
5. **Lock Release**: When a user leaves the page, the lock is released.

### User Interface

When a document is locked by another user, a red warning message is displayed at the top of the editor:

> "이 문서는 {username}님이 편집 중입니다."
> 
> (Translation: "This document is being edited by {username}.")

## Code Structure

```
src/
├── app/
│   └── api/
│       └── wiki/
│           ├── pages/
│           │   ├── lock/
│           │   │   └── route.ts     # Lock management API endpoints
│           │   └── route.ts         # Main pages API with cleanup function
├── components/
│   └── ui/
│       └── WikiEditor.tsx           # Editor component with lock implementation
├── models/
│   └── Wiki.ts                      # WikiPage schema with editLock fields
```

## How It Works

1. **When User A opens a document for editing:**
   - The system checks if the document is already locked
   - If not locked, User A acquires the lock
   - The lock expiry is set to 10 minutes from now

2. **When User B tries to open the same document:**
   - The system checks the lock status
   - If locked by User A, User B sees a warning message
   - User B can view the document but cannot edit it

3. **While User A is editing:**
   - Every 30 seconds, the lock status is checked
   - When User A saves the document, the lock is renewed
   - If User A leaves the page, the lock is released

4. **Automatic cleanup:**
   - Expired locks (older than 10 minutes) are automatically cleaned up
   - This prevents documents from being permanently locked

## Security Considerations

1. **Lock Ownership**: Only the lock owner can renew or release the lock
2. **Administrator Access**: Administrators can release locks owned by other users
3. **JWT Authentication**: All lock operations require valid user authentication
4. **Lock Expiry**: Locks automatically expire after 10 minutes to prevent indefinite locking

## Testing

To test the document locking system:

1. Open the same document in two different browser sessions
2. Start editing in the first session (User A)
3. Try to edit the same document in the second session (User B)
4. User B should see the lock warning message
5. After User A saves or leaves the page, User B should be able to edit

## Future Improvements

1. **Real-time Notifications**: Implement WebSocket-based real-time lock status updates
2. **Lock Queue**: Allow users to queue for document editing when it becomes available
3. **Extended Lock Time**: Allow users to extend the lock time if needed
4. **Lock Conflict Resolution**: Provide better conflict resolution when locks are forcibly released

## Troubleshooting

### Common Issues

1. **Lock not releasing**: If a lock isn't releasing properly, check if the cleanup function is working correctly
2. **False lock warnings**: Verify that the lock expiry time is being set correctly
3. **Authentication issues**: Ensure JWT tokens are valid and not expired

### Debugging

To debug lock issues:
1. Check the database to see current lock status
2. Verify API responses in browser developer tools
3. Check server logs for any errors in lock operations

---

This document provides an overview of the document locking system implementation. For detailed code information, refer to the individual files in the codebase.