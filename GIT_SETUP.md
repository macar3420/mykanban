# Git Setup for EC2 Server

## Step 1: Install Git on Fedora Server

SSH into your server and install git:

```bash
ssh -i mustafa-server.pem macar@ec2-16-171-181-79.eu-north-1.compute.amazonaws.com

# Install git
sudo dnf install -y git

# Verify installation
git --version
```

## Step 2: Configure Git (Basic Setup)

```bash
# Set your name and email (use your GitHub email)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Choose Authentication Method

You have two options: **SSH keys** (recommended) or **HTTPS with Personal Access Token**.

---

## Option A: SSH Keys (Recommended - More Secure)

### Step 1: Generate SSH Key on Server

```bash
# Generate SSH key (press Enter to accept default location)
ssh-keygen -t ed25519 -C "your.email@example.com"

# When prompted:
# - File location: Press Enter (default: ~/.ssh/id_ed25519)
# - Passphrase: Press Enter for no passphrase, or enter a secure passphrase

# Start SSH agent
eval "$(ssh-agent -s)"

# Add your SSH key to the agent
ssh-add ~/.ssh/id_ed25519
```

### Step 2: Copy Public Key

```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub
```

**Copy the entire output** (it starts with `ssh-ed25519` and ends with your email).

### Step 3: Add SSH Key to GitHub

1. Go to GitHub.com and log in
2. Click your profile picture → **Settings**
3. Click **SSH and GPG keys** in the left sidebar
4. Click **New SSH key**
5. Give it a title (e.g., "EC2 Server")
6. Paste your public key
7. Click **Add SSH key**

### Step 4: Test SSH Connection

```bash
# Test connection to GitHub
ssh -T git@github.com

# You should see: "Hi username! You've successfully authenticated..."
```

### Step 5: Clone Repository

```bash
# Clone using SSH
git clone git@github.com:5G00DM04-3007/course-project-mob-barley.git
cd course-project-mob-barley
```

---

## Option B: HTTPS with Personal Access Token (Easier Setup)

### Step 1: Create Personal Access Token on GitHub

1. Go to GitHub.com and log in
2. Click your profile picture → **Settings**
3. Scroll down → **Developer settings** (left sidebar)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name: "EC2 Server Deployment"
7. Select expiration: **90 days** (or your preference)
8. Select scopes: Check **repo** (gives full access to repositories)
9. Click **Generate token**
10. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### Step 2: Clone Repository

```bash
# Clone using HTTPS
git clone https://github.com/5G00DM04-3007/course-project-mob-barley.git
cd course-project-mob-barley

# When prompted for username: Enter your GitHub username
# When prompted for password: Paste your Personal Access Token (NOT your GitHub password)
```

### Step 3: Configure Git Credential Helper (Optional - Saves Token)

```bash
# Cache credentials for 1 hour
git config --global credential.helper 'cache --timeout=3600'

# Or store credentials permanently (less secure)
git config --global credential.helper store
```

**Note**: With `store`, your token will be saved in plain text. Use `cache` for better security.

---

## Quick Reference

### SSH Method (After Setup)
```bash
git clone git@github.com:5G00DM04-3007/course-project-mob-barley.git
cd course-project-mob-barley
git pull origin main  # To get latest changes
```

### HTTPS Method (After Setup)
```bash
git clone https://github.com/5G00DM04-3007/course-project-mob-barley.git
cd course-project-mob-barley
git pull origin main  # To get latest changes
```

## Troubleshooting

### SSH: "Permission denied (publickey)"
- Make sure you added your public key to GitHub
- Verify key is loaded: `ssh-add -l`
- Test connection: `ssh -T git@github.com`

### HTTPS: "Authentication failed"
- Make sure you're using Personal Access Token, not password
- Check token hasn't expired
- Verify token has `repo` scope

### Git not found
```bash
# Install git
sudo dnf install -y git
```

## Recommendation

**Use SSH keys** - They're more secure, don't expire, and don't require entering credentials each time.

