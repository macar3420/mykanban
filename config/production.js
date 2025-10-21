// Production Configuration
export const production = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: 'production',

  // Database Configuration
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: true,
    sslCaPath: process.env.DB_SSL_CA_PATH || '/opt/amazon-rds-ca-bundle.pem',
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
  },

  // Frontend Configuration
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL,
    apiUrl: process.env.VITE_API_URL,
  },

  // Security Configuration
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    bcryptRounds: 12,
  },

  // Logging Configuration
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: true,
    logFile: '/var/log/app.log',
  },

  // Production Features
  features: {
    enableDebugRoutes: false,
    enableTestData: false,
    enableHotReload: false,
  },
};
