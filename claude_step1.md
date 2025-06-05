# Claude-Step1.md - Real Activity Monitor Implementation

## Current State
The dashboard currently shows mock activity data from a hardcoded array. We need to implement a real activity monitoring system that tracks:
- File system changes
- Error logs
- User actions
- System events

## Implementation Goals

### 1. File System Monitoring Service
**Location**: `src/services/file-system-monitor.ts`

Create a service that:
- Watches specified directories for file changes
- Detects file creation, modification, and deletion
- Tracks which files are being edited
- Monitors git repository changes
- Sends real-time updates to the dashboard

**Key Technologies**:
- Node.js `fs.watch()` or `chokidar` library for file watching
- WebSocket or Server-Sent Events for real-time updates
- File diff detection for change details

### 2. Error Log Integration
**Location**: `src/services/error-monitor.ts`

Implement:
- Integration with VS Code extension API (if applicable)
- Log file parsing for common development tools
- Error pattern recognition
- Stack trace parsing and categorization

### 3. Real-time Activity Stream
**Location**: `src/components/activity-stream.tsx`

Replace the mock data with:
- WebSocket connection to backend services
- Real-time activity feed
- Activity filtering and search
- Export functionality for activity logs

### 4. Plugin System Integration
**Location**: `src/services/plugin-system.ts`

Create infrastructure for:
- Loading plugins from `/plugins` directory
- Plugin registration and lifecycle management
- Plugin event emission for activity tracking
- Plugin-specific activity categorization

## Technical Requirements

### Database Schema
```typescript
interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'file_change' | 'error' | 'user_action' | 'system_event' | 'plugin_event';
  source: string; // file path, plugin name, etc.
  message: string;
  details?: {
    filePath?: string;
    changeType?: 'created' | 'modified' | 'deleted';
    linesChanged?: { added: number; removed: number };
    errorStack?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  metadata?: Record<string, any>;
}
```

### API Endpoints Needed
- `GET /api/activities` - Fetch recent activities
- `POST /api/activities` - Add new activity (for plugins/external tools)
- `WebSocket /api/activities/stream` - Real-time activity stream
- `GET /api/activities/export` - Export activities in various formats

### Environment Setup
1. Set up file system permissions for monitoring
2. Configure which directories to watch
3. Set up real-time communication infrastructure
4. Initialize activity database/storage

## Implementation Priority
1. **High**: File system monitoring (most visible impact)
2. **High**: Real-time dashboard updates
3. **Medium**: Error log integration
4. **Medium**: Plugin system events
5. **Low**: Advanced filtering and export features

## Success Criteria
- Dashboard shows real file changes as they happen
- System can detect and display actual errors from development tools
- Activity stream updates in real-time without manual refresh
- Performance impact on system is minimal
- Plugin system can contribute to activity stream

## Files to Create/Modify
- `src/services/file-system-monitor.ts` (new)
- `src/services/error-monitor.ts` (new)
- `src/services/activity-service.ts` (new)
- `src/app/(app)/dashboard/page.tsx` (modify)
- `src/components/activity-stream.tsx` (new)
- `src/lib/websocket.ts` (new)
- `package.json` (add dependencies like `chokidar`, `ws`)

## Next Step
After implementing the real activity monitor, proceed to **Claude-Step2.md** for AI Escalation System implementation.