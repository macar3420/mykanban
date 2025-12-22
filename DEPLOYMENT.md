# Deployment Guide for EC2 Server

## Server Details
- **Domain**: kanban.mnacar.com
- **Server**: macar@ec2-16-171-181-79.eu-north-1.compute.amazonaws.com
- **OS**: Fedora Linux
- **Nginx Port**: 80 (external, shared with other sites via server_name)
- **Frontend Container Port**: 8083 (host) → 80 (container)
- **Backend Container Port**: 3001 (host) → 3000 (container)
- **Access URL**: http://kanban.mnacar.com

## Prerequisites

1. EC2 instance running Fedora Linux
2. Domain `kanban.mnacar.com` pointing to EC2 public IP in Route53
3. Security group allowing ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
4. **Note**: Port 80 is shared with other sites (nginx handles multiple sites via server_name)
4. SSH key file: `mustafa-server.pem` (ensure it has correct permissions: `chmod 400 mustafa-server.pem`)

## Quick SSH Reference

```bash
# Connect to server
ssh -i mustafa-server.pem macar@ec2-16-171-181-79.eu-north-1.compute.amazonaws.com

# Connect to server
ssh -i mustafa-server.pem macar@ec2-16-171-181-79.eu-north-1.compute.amazonaws.com

# Clone repository on server
git clone git@github.com:5G00DM04-3007/course-project-mob-barley.git
# Or use HTTPS: git clone https://github.com/5G00DM04-3007/course-project-mob-barley.git

# Pull latest changes (after initial clone)
cd course-project-mob-barley
git pull origin main
```

## Step 1: Install Dependencies on Server

```bash
# Install Git (needed to clone repository)
sudo dnf install -y git

# Install Docker and Docker Compose
sudo dnf install -y docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Install Nginx
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# Install Certbot for SSL
sudo dnf install -y certbot python3-certbot-nginx
```

**Next**: Set up Git authentication. See `GIT_SETUP.md` for detailed instructions on:
- Installing Git (already done above)
- Setting up SSH keys OR Personal Access Token
- Configuring Git credentials

## Step 2: Push Changes to Git (if not already done)

On your local machine, commit and push your changes:

```bash
cd /home/macar/Documents/course-project-mob-barley

# Add new files
git add docker-compose.prod.yml docker-compose.yml DEPLOYMENT.md nginx.conf.example backend/src/init-db.js .env.production.example backend/.env.production.example

# Commit changes
git commit -m "Add production deployment configuration"

# Push to GitHub
git push origin main
```

## Step 3: Set Up Git Authentication

**IMPORTANT**: Before cloning, you need to authenticate with GitHub. See `GIT_SETUP.md` for complete instructions.

**Quick options:**

**Option A - SSH (Recommended):**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"
cat ~/.ssh/id_ed25519.pub  # Copy this and add to GitHub Settings → SSH keys

# Test connection
ssh -T git@github.com

# Clone repository
git clone git@github.com:5G00DM04-3007/course-project-mob-barley.git
cd course-project-mob-barley
```

**Option B - HTTPS (Easier):**
```bash
# Clone repository (will prompt for GitHub username and Personal Access Token)
git clone https://github.com/5G00DM04-3007/course-project-mob-barley.git
cd course-project-mob-barley
```

**See `GIT_SETUP.md` for detailed step-by-step instructions.**

## Step 4: Set Up Environment Variables

On the server:

```bash
cd ~/course-project-mob-barley

# Copy example files
cp .env.production.example .env
cp backend/.env.production.example backend/.env

# Edit .env files with your actual values
nano .env
nano backend/.env
```

**Important**:
- Use strong passwords for MySQL
- Generate random strings for SESSION_SECRET and JWT_SECRET (use: `openssl rand -base64 32`)
- Set `FRONTEND_BASE_URL=https://kanban.mnacar.com`

## Step 6: Configure Nginx

```bash
# Copy nginx config example to create kanban.conf
sudo cp nginx.conf.example /etc/nginx/conf.d/kanban.conf

# Verify the config (optional - view it)
sudo cat /etc/nginx/conf.d/kanban.conf

# Test nginx configuration syntax
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# If nginx is not running, start it
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Note**:
- Config uses port **80** (nginx handles multiple sites on port 80 via different `server_name` values)
- Access your site at: `http://kanban.mnacar.com` (no port needed)
- Make sure port 80 is open in your EC2 security group

## Step 7: Start Docker Services

```bash
cd ~/course-project-mob-barley

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Step 8: Set Up SSL Certificate

After DNS is properly configured and pointing to your server:

```bash
sudo certbot --nginx -d kanban.mnacar.com -d www.kanban.mnacar.com
```

Follow the prompts. Certbot will automatically update your Nginx config to use HTTPS.

## Step 9: Verify Deployment

1. Visit `http://kanban.mnacar.com` in your browser
2. Check backend health: `curl http://kanban.mnacar.com/api/v1/health`
3. View logs: `docker compose -f docker-compose.prod.yml logs -f`

**Note**:
- Site is accessible at `http://kanban.mnacar.com` (port 80, no port number needed)
- Make sure port 80 is open in your EC2 security group
- For SSL/HTTPS later, use Certbot: `sudo certbot --nginx -d kanban.mnacar.com`

## Useful Commands

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Restart services
docker compose -f docker-compose.prod.yml restart

# View logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs mysql

# Backup database
docker compose -f docker-compose.prod.yml exec mysql mysqldump -u mob_user -p$DB_PASSWORD mob_barley | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore database
gunzip < backup_file.sql.gz | docker compose -f docker-compose.prod.yml exec -T mysql mysql -u mob_user -p$DB_PASSWORD mob_barley
```

## Troubleshooting

### Port 8081 already in use
```bash
sudo lsof -i :8081
sudo kill -9 <PID>
```

### Nginx not starting
```bash
sudo nginx -t  # Check config syntax
sudo systemctl status nginx
sudo journalctl -u nginx -f
```

### Docker containers not starting
```bash
docker compose -f docker-compose.prod.yml logs
docker compose -f docker-compose.prod.yml ps
```

### Database connection issues
- Verify MySQL container is healthy: `docker compose -f docker-compose.prod.yml ps mysql`
- Check backend logs: `docker compose -f docker-compose.prod.yml logs backend`
- Verify DB credentials in `.env` files

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong SESSION_SECRET and JWT_SECRET
- [ ] SSL certificate installed and working
- [ ] Security group only allows 22, 80, 443
- [ ] MySQL port 3306 not exposed publicly
- [ ] Regular backups configured
- [ ] Firewall configured (if using firewalld)

