// Feature Flag Middleware
import { getFeatureFlagsForUser } from '../featureFlags.js';

/**
 * Middleware to inject feature flags into request context
 * This allows routes to access feature flags for the current user
 */
export function featureFlagMiddleware(req, res, next) {
  // Get user ID from session or JWT token
  const userId = req.user?.id || req.session?.userId || 'anonymous';

  // Get feature flags for this user
  req.featureFlags = getFeatureFlagsForUser(userId);

  // Add helper methods to request object
  req.isFeatureEnabled = (flagName) => {
    return req.featureFlags[flagName] || false;
  };

  next();
}

/**
 * Middleware to check if a specific feature is enabled
 * Returns 404 if feature is disabled
 */
export function requireFeature(flagName) {
  return (req, res, next) => {
    if (!req.isFeatureEnabled(flagName)) {
      return res.status(404).json({
        error: 'Feature not available',
        message: `The ${flagName} feature is currently disabled`,
      });
    }
    next();
  };
}
