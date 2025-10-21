// Feature Flags System
// This system allows for gradual rollouts and A/B testing of new features

const FEATURE_FLAGS = {
  // Authentication Features (existing)
  ENABLE_PASSWORD_RESET: process.env.FEATURE_PASSWORD_RESET === 'true' || true,

  // Task Management Features (for future development)
  ENABLE_TASK_ASSIGNMENTS: process.env.FEATURE_TASK_ASSIGNMENTS === 'true' || false,
  ENABLE_TASK_DUE_DATES: process.env.FEATURE_DUE_DATES === 'true' || false,
  ENABLE_TASK_COMMENTS: process.env.FEATURE_TASK_COMMENTS === 'true' || false,
  ENABLE_TASK_PRIORITIES: process.env.FEATURE_TASK_PRIORITIES === 'true' || false,

  // UI/UX Features (potential future features)
  ENABLE_DARK_MODE: process.env.FEATURE_DARK_MODE === 'true' || false,
  ENABLE_ANIMATIONS: process.env.FEATURE_ANIMATIONS === 'true' || true,
  ENABLE_KEYBOARD_SHORTCUTS: process.env.FEATURE_KEYBOARD_SHORTCUTS === 'true' || false,

  // Performance Features (potential future features)
  ENABLE_CACHING: process.env.FEATURE_CACHING === 'true' || false,
  ENABLE_ANALYTICS: process.env.FEATURE_ANALYTICS === 'true' || false,

  // Development Features (existing)
  ENABLE_DEBUG_ROUTES: process.env.FEATURE_DEBUG_ROUTES === 'true' || process.env.NODE_ENV === 'development',
  ENABLE_TEST_DATA: process.env.FEATURE_TEST_DATA === 'true' || process.env.NODE_ENV === 'development',
};

/**
 * Check if a feature flag is enabled
 * @param {string} flagName - The name of the feature flag
 * @returns {boolean} - Whether the feature is enabled
 */
export function isFeatureEnabled(flagName) {
  if (!(flagName in FEATURE_FLAGS)) {
    console.warn(`Unknown feature flag: ${flagName}`);
    return false;
  }
  return FEATURE_FLAGS[flagName];
}

/**
 * Get all feature flags (for debugging/admin purposes)
 * @returns {Object} - All feature flags and their values
 */
export function getAllFeatureFlags() {
  return { ...FEATURE_FLAGS };
}

/**
 * Get feature flags for a specific user (for A/B testing)
 * @param {string} userId - The user ID
 * @returns {Object} - Feature flags specific to this user
 */
export function getFeatureFlagsForUser(userId) {
  // Simple hash-based feature flag assignment for A/B testing
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  const isInTestGroup = Math.abs(hash) % 2 === 0;

  return {
    ...FEATURE_FLAGS,
    // Override specific flags based on user group
    ENABLE_DARK_MODE: isInTestGroup ? true : FEATURE_FLAGS.ENABLE_DARK_MODE,
    ENABLE_ANIMATIONS: isInTestGroup ? false : FEATURE_FLAGS.ENABLE_ANIMATIONS,
  };
}

export default FEATURE_FLAGS;
