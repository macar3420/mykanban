# Resilience Plan

## 1. Failure: Database crash (Amazon RDS outage)

### Detection

How will we know the database is down?

- [x] `/ready` health check endpoint returns 503 status
- [x] Monitoring alert from RDS event notifications
- [ ] Users report "Cannot load data" errors in the UI

### Immediate Impact

Which parts of the app are affected?

- [x] API endpoints fail (all database-dependent operations)
- [x] Users can't log in or maintain sessions
- [x] Data updates fail but read-only mode still works (if cached)

### Mitigation

What can we do to reduce impact?

- [ ] Serve cached data (future enhancement)
- [ ] Redirect traffic to another instance (if multi-region setup)
- [x] Notify users of degraded performance via status page

### Recovery

How do we restore service?

- [x] Check RDS status in AWS Console, restart instance if needed
- [x] Restore from latest backup using `restore.sh` script if data loss occurred
- [x] Redeploy backend once database is reachable

---

## 2. Failure: API downtime (Backend container crash)

### Detection

How will we know the backend is down?

- [x] Health check fails (`/health` endpoint returns 404/500)
- [x] Users report "Server not responding"
- [x] Monitoring alert triggers (Docker healthcheck failures)

### Immediate Impact

Which parts of the app are affected?

- [x] API endpoints fail (all backend requests)
- [x] Users can't log in
- [x] Frontend loads but cannot fetch data or authenticate

### Mitigation

What can we do to reduce impact?

- [ ] Serve cached data (future enhancement)
- [x] Redirect traffic to another instance (via Docker restart policy)
- [x] Notify users of degraded performance

### Recovery

How do we restore service?

- [x] Restart database container (if database issue)
- [x] Restore from latest backup (if data corruption)
- [x] Redeploy backend (`docker compose up -d --build`)

---

## 3. Failure: VM failure (Server/host machine crash)

### Detection

How will we know the VM is down?

- [x] Health check fails (all endpoints unreachable)
- [x] Users report "Server not responding"
- [x] Monitoring alert triggers (host unreachable)

### Immediate Impact

Which parts of the app are affected?

- [x] API endpoints fail (entire backend unavailable)
- [x] Users can't log in
- [x] Frontend cannot connect to backend

### Mitigation

What can we do to reduce impact?

- [ ] Serve cached data (if CDN available)
- [x] Redirect traffic to another instance (if backup server available)
- [x] Notify users of degraded performance

### Recovery

How do we restore service?

- [x] Restart database container (if database on same VM)
- [x] Restore from latest backup (if data loss)
- [x] Redeploy backend (via GitHub Actions workflow or manual deployment)
