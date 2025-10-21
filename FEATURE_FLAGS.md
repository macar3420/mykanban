# Feature Flags System

This document describes the feature flags system implemented in the Mob Barley project.

## Overview

Feature flags allow for:
- **Gradual rollouts**: Enable features for a subset of users
- **A/B testing**: Test different versions of features
- **Emergency toggles**: Quickly disable problematic features
- **Environment-specific features**: Different features for dev/prod

## Implementation

### Backend Feature Flags

The feature flags system is implemented in `backend/src/featureFlags.js` and includes:

#### Authentication Features
- `ENABLE_PASSWORD_RESET`: Controls password reset functionality (currently enabled)

#### Task Management Features (Future Features - Not Yet Implemented)
- `ENABLE_TASK_ASSIGNMENTS`: Controls task assignment to users (planned feature)
- `ENABLE_TASK_DUE_DATES`: Controls due date functionality (planned feature)
- `ENABLE_TASK_COMMENTS`: Controls task commenting system (planned feature)
- `ENABLE_TASK_PRIORITIES`: Controls task priority levels (planned feature)

#### UI/UX Features (future features)
- `ENABLE_DARK_MODE`: Controls dark mode theme

### Example Usage

#### 1. Basic Feature Check
```javascript
import { isFeatureEnabled } from '../featureFlags.js';

if (isFeatureEnabled('ENABLE_DARK_MODE')) {
  // Render dark mode UI
  res.json({ theme: 'dark' });
}
```

#### 2. Middleware Integration
```javascript
import { requireFeature } from '../middlewares/featureFlagMiddleware.js';

// Only allow access if feature is enabled (returns 404 if disabled)
app.get('/api/v1/tasks/assignments',
  requireFeature('ENABLE_TASK_ASSIGNMENTS'),
  getTaskAssignments  // This route would be implemented when feature is ready
);
```

#### 3. User-Specific Feature Flags
```javascript
import { getFeatureFlagsForUser } from '../featureFlags.js';

// Get flags for specific user (enables A/B testing)
const userFlags = getFeatureFlagsForUser(userId);
if (userFlags.ENABLE_DARK_MODE) {
  // User is in dark mode test group
}
```

## Configuration

Feature flags can be controlled via environment variables:

```bash
# Enable specific features
FEATURE_DARK_MODE=true
FEATURE_TASK_ASSIGNMENTS=true
FEATURE_ANALYTICS=false

# Disable features
FEATURE_DRAG_DROP=false
```

## A/B Testing Implementation

The system includes user-based feature flag assignment for A/B testing:

1. **User Hashing**: Users are assigned to test groups based on a hash of their user ID
2. **Consistent Assignment**: Same user always gets the same feature flags
3. **Gradual Rollout**: Can control what percentage of users see new features

## Example: Dark Mode Feature Flag

### Backend Implementation
```javascript
// In a route handler
app.get('/api/v1/user/preferences', (req, res) => {
  const preferences = {
    theme: req.isFeatureEnabled('ENABLE_DARK_MODE') ? 'dark' : 'light',
    animations: req.isFeatureEnabled('ENABLE_ANIMATIONS'),
  };
  res.json(preferences);
});
```

### Frontend Implementation
```javascript
// In React component
const [preferences, setPreferences] = useState(null);

useEffect(() => {
  fetch('/api/v1/user/preferences')
    .then(res => res.json())
    .then(data => {
      setPreferences(data);
      // Apply theme based on feature flag
      if (data.theme === 'dark') {
        document.body.classList.add('dark-mode');
      }
    });
}, []);
```

## Benefits

1. **Risk Mitigation**: Disable features quickly if issues arise
2. **Gradual Rollouts**: Enable features for small user groups first
3. **A/B Testing**: Compare feature performance between user groups
4. **Environment Control**: Different features for different environments
5. **Development Speed**: Deploy incomplete features behind flags

## Monitoring

Feature flags should be monitored to ensure:
- Feature adoption rates
- Performance impact
- User feedback
- Error rates

## Best Practices

1. **Clear Naming**: Use descriptive flag names
2. **Documentation**: Document what each flag controls
3. **Cleanup**: Remove flags for features that are fully rolled out
4. **Testing**: Test both enabled and disabled states
5. **Monitoring**: Monitor feature flag usage and impact
