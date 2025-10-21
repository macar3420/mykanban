# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added
- Complete user authentication system with login, signup, and password reset
- Task management system with To Do, In Progress, and Done columns
- User registration and login with secure password hashing
- Password reset functionality with backend-generated token system
- Comprehensive test suite (frontend: 13 tests, backend: 7 tests)
- CI/CD pipeline with GitHub Actions
- Docker containerization for both frontend and backend
- Automated linting and code quality checks
- Production-ready build system
- Responsive design
- UI design with custom fonts and animations
- Database integration with MySQL (Amazon RDS)
- RESTful API endpoints for tasks and user management
- Environment configuration management
- Security middleware (helmet, CORS, cookie parsing)
- Feature flags system for gradual rollouts

### Changed
- Updated CI/CD pipeline to support multiple branches (main, initial-mvp, initial-rds)
- Improved test coverage and reliability

### Fixed
- Resolved all failing tests in frontend and backend
- Fixed linting issues and code formatting
- Corrected CI/CD pipeline configuration
- Fixed Docker build processes
- Resolved dependency issues
- Fixed authentication issues

### Removed
- Redundant configuration files

## [Unreleased]

### Added
- Feature flags system for gradual rollouts
- Enhanced monitoring and logging
- Performance optimizations

### Changed
- Improved development and production environment separation
- Enhanced security configurations (helmet, CORS, cookie parsing)

### Fixed
- Minor UI/UX improvements
- Performance optimizations

### Removed
- Legacy code and deprecated features
