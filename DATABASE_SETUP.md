# Database Configuration Guide

This application supports three database options:
- **Azure SQL Database** (recommended for cloud deployment)
- **MySQL** (compatible with Render, Railway, etc.)
- **SQL Server Express** (local development on Windows)

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and set your database credentials**

3. **Set `DB_TYPE` to match your database:**
   - `azuresql` for Azure SQL Database
   - `mysql` for MySQL
   - `sqlserver` for local SQL Server Express

---

## Azure SQL Database Setup (Recommended for Production)

### Step 1: Create Azure SQL Database

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **SQL Database**
3. Note your server name: `your-server-name.database.windows.net`
4. Create admin username and password

### Step 2: Configure Firewall

1. In Azure Portal, go to your SQL Server
2. Click **"Firewalls and virtual networks"**
3. Add your IP address or:
   - Check **"Allow Azure services and resources to access this server"** (for Render deployment)

### Step 3: Run Database Schema

1. Connect using Azure Data Studio or SQL Server Management Studio
2. Run the SQL script: `database/mathgameapp_schema.sql`

### Step 4: Update `.env` File

```env
DB_TYPE=azuresql

AZURE_SQL_SERVER=your-server-name.database.windows.net
AZURE_SQL_DATABASE=mathgameapp
AZURE_SQL_USER=your-admin-username
AZURE_SQL_PASSWORD=your-secure-password
AZURE_SQL_PORT=1433
AZURE_SQL_ENCRYPT=true
AZURE_SQL_TRUST_SERVER_CERTIFICATE=false
```

### Step 5: Install Dependencies & Run

```bash
npm install
npm start
```

---

## MySQL Setup (For Render/Railway Deployment)

### Step 1: Create MySQL Database

**Option A - Railway (Includes Free MySQL):**
1. Go to [Railway.app](https://railway.app)
2. Create new project
3. Add MySQL database
4. Copy connection details

**Option B - External MySQL Host:**
- PlanetScale: https://planetscale.com (5GB free)
- FreeSQLDatabase: https://www.freesqldatabase.com

### Step 2: Run Database Schema

1. Connect to MySQL using MySQL Workbench or CLI
2. Run: `database/mathgameapp_schema.sql`

### Step 3: Update `.env` File

```env
DB_TYPE=mysql

MYSQL_HOST=your-mysql-host.com
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=mathgameapp
```

### Step 4: Run Application

```bash
npm install
npm start
```

---

## SQL Server Express Setup (Local Development)

### Step 1: Install SQL Server Express

1. Download: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
2. Install with default settings
3. Instance name: `SQLEXPRESS`

### Step 2: Create Database

1. Open SQL Server Management Studio (SSMS)
2. Connect to `localhost\SQLEXPRESS`
3. Run: `database/mathgameapp_schema.sql`

### Step 3: Update `.env` File

```env
DB_TYPE=sqlserver

SQLSERVER_SERVER=localhost\\SQLEXPRESS
SQLSERVER_DATABASE=mathgameapp
SQLSERVER_USER=
SQLSERVER_PASSWORD=
```

Leave USER and PASSWORD empty to use Windows Authentication.

### Step 4: Run Application

```bash
npm install
npm start
```

---

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DB_TYPE` | Database type: `azuresql`, `mysql`, or `sqlserver` | Yes | `azuresql` |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment: `development` or `production` | No | `development` |
| `SESSION_SECRET` | Secret key for session encryption | Yes | (change in production) |
| `SESSION_MAX_AGE` | Session timeout in milliseconds | No | `28800000` (8 hours) |

### Azure SQL Variables
- `AZURE_SQL_SERVER` - Azure SQL server hostname
- `AZURE_SQL_DATABASE` - Database name
- `AZURE_SQL_USER` - Admin username
- `AZURE_SQL_PASSWORD` - Admin password
- `AZURE_SQL_PORT` - Port (default: 1433)
- `AZURE_SQL_ENCRYPT` - Enable encryption (default: true)

### MySQL Variables
- `MYSQL_HOST` - MySQL server hostname
- `MYSQL_PORT` - MySQL port (default: 3306)
- `MYSQL_USER` - Database username
- `MYSQL_PASSWORD` - Database password
- `MYSQL_DATABASE` - Database name

### SQL Server Variables
- `SQLSERVER_SERVER` - Server instance (e.g., `localhost\SQLEXPRESS`)
- `SQLSERVER_DATABASE` - Database name
- `SQLSERVER_USER` - Username (optional for Windows Auth)
- `SQLSERVER_PASSWORD` - Password (optional for Windows Auth)

---

## Deployment to Render

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add database configuration"
   git push origin main
   ```

2. **Create Web Service on Render:**
   - Go to https://render.com
   - New ? Web Service
   - Connect your GitHub repo: `Austin/mathgame-web`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables in Render:**
   - Go to Environment tab
   - Add all variables from your `.env` file
   - Set `DB_TYPE=azuresql` (or `mysql` if using external MySQL)

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for build to complete
   - Your app will be live! ??

---

## Troubleshooting

### Connection Errors

**Azure SQL:**
- Check firewall rules in Azure Portal
- Verify credentials are correct
- Ensure `AZURE_SQL_ENCRYPT=true`

**MySQL:**
- Verify host and port are correct
- Check if remote connections are allowed
- Test connection using MySQL Workbench

**SQL Server:**
- Ensure SQL Server service is running
- Check instance name is correct
- Verify Windows Authentication is enabled

### Check Logs

```bash
npm start
```

Look for database connection messages:
- `[DB] Connected to Azure SQL Database successfully.`
- `[DB] Connected to MySQL successfully.`
- `[DB] Connected to SQL Server successfully.`

---

## Security Notes

?? **NEVER commit `.env` file to Git!**

- The `.env` file contains sensitive credentials
- It's already added to `.gitignore`
- Use environment variables in production (Render, Railway, etc.)
- Rotate passwords regularly
- Use strong passwords for production databases

---

## Need Help?

- Check server logs for detailed error messages
- Verify database schema is installed correctly
- Test database connection using GUI tools first
- Ensure firewall/network access is configured
