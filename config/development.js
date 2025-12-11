// Development Configuration
export const development = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: 'development',

  // Database Configuration
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'devpass',
    database: process.env.DB_NAME || 'mob_barley',
    ssl: false,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
  },

  // Frontend Configuration
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:8080',
    apiUrl: process.env.VITE_API_URL || 'http://localhost:3000',
  },

  // Security Configuration
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    bcryptRounds: 10,
  },

  // Logging Configuration
  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: false,
  },

  // Development Features
  features: {
    enableDebugRoutes: true,
    enableTestData: true,
    enableHotReload: true,
  },
};
