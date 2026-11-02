# Takarivo — Local Setup Guide

Takarivo runs fully on your own computer: your data lives in a local MySQL
database and nothing is deployed anywhere. Internet is only needed once,
to install the tools and packages.

## 1. Install the tools (once)

- **Node.js** (LTS version) — https://nodejs.org
- **MySQL Community Server** (+ MySQL Workbench) — https://dev.mysql.com/downloads/installer/
  Remember the root password you set during installation.

## 2. Create the database

In MySQL Workbench open `database/setup.sql` and run it (lightning-bolt button).
It creates the `takarivo` database and every table.

## 3. Configure `.env`

Copy `.env.example` to a new file named `.env` and fill in your MySQL
password. Generate a `JWT_SECRET` with:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

## 4. Install packages (once)

    npm install

## 5. Start the app

    npm run dev

Open the address it prints (for example http://localhost:8888). Always use
that address — opening the .html files by double-click will not work,
because the backend only runs through `npm run dev`.

## 6. First use

Click "Get Started" and create your account. For sample data to explore,
run `npm run seed` and sign in with `demo@takarivo.local` / `demo12345`.

## Backing up your data

    mysqldump -u root -p takarivo > takarivo-backup.sql

To restore: run that file in MySQL Workbench against an empty `takarivo` database.

## Troubleshooting

- **"Failed to fetch" / "Unable to reach the server"** — `npm run dev` is not running, or you opened the page from a different address than the one it printed.
- **"Access denied for user"** — wrong `MYSQL_USER` / `MYSQL_PASSWORD` in `.env`. Restart `npm run dev` after editing `.env`.
- **"Unknown database 'takarivo'"** — run `database/setup.sql` (step 2).
- **"JWT_SECRET is missing"** — add it to `.env`, restart.
- **Signed out suddenly after editing `.env`** — changing `JWT_SECRET` signs everyone out; just log in again.
- **Port already in use** — close the other terminal running `npm run dev`; the CLI may also pick a different port and print it.
- **"Cannot find module 'mysql2'" (or bcryptjs / jsonwebtoken) inside a function** — add this to `netlify.toml`, then restart:

      [functions]
        node_bundler = "esbuild"
        external_node_modules = ["mysql2", "bcryptjs", "jsonwebtoken"]
