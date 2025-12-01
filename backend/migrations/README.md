# Database Migrations

This folder contains legacy migration scripts for database schema changes and data migration. 

⚠️ **Note**: As of the latest version, most database migrations are now handled automatically by `models.py::init_db()` function which runs on application startup. These scripts are kept for reference and one-time data migration purposes.

## 📋 Available Migration Scripts

### `migrate_db.py` - SQLite to PostgreSQL Migration

**Purpose**: Migrates data from SQLite backup database to PostgreSQL database.

**When to use:**
- **One-time migration**: When moving from SQLite (local development) to PostgreSQL (production/Docker)
- **Data backup restoration**: Restoring data from a SQLite backup file to PostgreSQL
- **Database upgrade**: Upgrading from local SQLite to containerized PostgreSQL setup

**What it migrates:**
- `api_keys` table: API keys for exchanges
- `trade_logs` table: Historical trade records
- `price_logs` table: Historical price data (batched for performance)

**Prerequisites:**
- SQLite backup file named `bithumb_trading.db` in the backend directory
- PostgreSQL database running and accessible
- Required Python packages: `psycopg2`, `sqlite3` (built-in)

**How to use:**

**With Docker (recommended):**
```bash
# 1. Copy SQLite backup file to backend directory (if not already there)
cp /path/to/backup/bithumb_trading.db backend/

# 2. Execute migration inside backend container
docker-compose exec backend python migrations/migrate_db.py
```

**Without Docker (Local):**
```bash
cd backend

# Set PostgreSQL connection parameters (if different from defaults)
export PG_HOST=localhost
export PG_PORT=5432
export PG_DB=bithumb_trading
export PG_USER=bithumb
export PG_PASS=bithumb_pass

# Run migration
python migrations/migrate_db.py
```

**Environment Variables:**
- `PG_HOST`: PostgreSQL host (default: `localhost`)
- `PG_PORT`: PostgreSQL port (default: `5432`)
- `PG_DB`: Database name (default: `bithumb_trading`)
- `PG_USER`: Database user (default: `bithumb`)
- `PG_PASS`: Database password (default: `bithumb_pass`)

**Notes:**
- The script checks for existing records to avoid duplicates
- Price logs are inserted in batches of 1000 for better performance
- If a table doesn't exist in the SQLite backup, it will skip that table with a warning
- The script will rollback all changes if any error occurs during migration

---

### `add_column.py` - Add market_data Column (SQLite Only)

**Purpose**: Adds `market_data` JSON column to `price_logs` table in SQLite database.

**When to use:**
- **Legacy SQLite databases**: If you have an old SQLite database that doesn't have the `market_data` column
- **Manual schema update**: When you need to manually add the column without using the automatic migration

⚠️ **Note**: This script is **SQLite only**. For PostgreSQL, the column is automatically added by `init_db()` function.

**How to use:**

**With Docker:**
```bash
# Only works if using SQLite (not PostgreSQL)
# Make sure DATABASE_URL points to SQLite
docker-compose exec backend python migrations/add_column.py
```

**Without Docker (Local):**
```bash
cd backend
python migrations/add_column.py
```

**What it does:**
- Adds `market_data JSON DEFAULT '{}'` column to `price_logs` table
- If the column already exists, it will skip with a message
- Only works with SQLite databases

---

## 🔄 Automatic Migrations

The application now handles most migrations automatically through `models.py::init_db()`:

- ✅ Table creation (if tables don't exist)
- ✅ Column additions (missing columns are added automatically)
- ✅ Column renames (PostgreSQL only)
- ✅ Schema updates on every application startup

**No manual migration needed** for:
- Adding new columns defined in models
- Creating new tables
- Basic schema updates

See `backend/models.py` for the complete list of automatic migrations.

---

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running any migration script
2. **One-time Use**: These scripts are designed for one-time migrations, not for regular use
3. **Test Environment**: Test migrations on a copy of your database first
4. **Docker vs Local**: Make sure you're running migrations against the correct database (Docker PostgreSQL vs local SQLite)
5. **Data Loss Risk**: Migration scripts may modify or delete data. Review the code before running.

---

## 🐛 Troubleshooting

### Migration fails with connection error
- **Docker**: Ensure containers are running (`docker-compose ps`)
- **PostgreSQL**: Check if database is accessible and credentials are correct
- **SQLite**: Verify the backup file exists in the backend directory

### Duplicate key errors
- The migration script checks for existing records, but if you see duplicate errors, you may need to clean the target database first

### Column already exists errors
- This is normal for `add_column.py` - it means the column was already added
- For automatic migrations, the application handles this gracefully

---

## 📚 Related Documentation

- Main README: `/README.md`
- Utility Scripts: `/backend/scripts/README.md` (if exists)
- Database Models: `/backend/models.py`
