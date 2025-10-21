// Configuration Management
import { development } from './development.js';
import { production } from './production.js';

const configs = {
  development,
  production,
  test: {
    ...development,
    database: {
      ...development.database,
      database: 'mob_barley_test',
    },
    logging: {
      level: 'error',
      enableConsole: false,
      enableFile: false,
    },
  },
};

const nodeEnv = process.env.NODE_ENV || 'development';
const config = configs[nodeEnv];

if (!config) {
  throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be one of: ${Object.keys(configs).join(', ')}`);
}

// Validate required environment variables in production
if (nodeEnv === 'production') {
  const requiredVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'SESSION_SECRET',
    'JWT_SECRET',
    'FRONTEND_BASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export default config;
