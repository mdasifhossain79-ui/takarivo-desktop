# Takarivo Desktop ৳

A full-featured personal finance management desktop application designed for streamlined budgeting, expense tracking, cards, accounts, and financial reports.

---

## 🌟 Key Features

- **📊 Comprehensive Financial Dashboard**: Real-time overview of total balance, monthly income, expenses, and savings rate.
- **💳 Accounts & Cards Management**: Track bank accounts, credit cards, debit cards, balances, and payment cycles.
- **🎯 Budgets & Goals**: Set category-specific spending budgets and long-term savings goals with progress tracking.
- **📝 Transaction Tracking**: Log income and expenses with categories, payment methods, and automated calculations.
- **📈 Visual Analytics & Reports**: Interactive charts (powered by Chart.js) and financial summaries.
- **💾 CSV Import & Export**: Import transactions from bank exports or download your financial records.
- **🖥️ Standalone Desktop Launcher**: One-click startup via `Takarivo-App.bat` running as a borderless Windows desktop application.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (custom design system), Vanilla JavaScript (ES6+)
- **Charts**: Chart.js
- **Backend / API**: Node.js & Netlify Functions (Local serverless runtime)
- **Database**: MySQL
- **Python Utilities**: Data processors and automated financial report generation (`python/`)

---

## 🚀 Quick Start (Desktop)

### Option 1: One-Click Desktop Launcher
1. Double-click `create-desktop-shortcut.bat` to create a shortcut on your Windows desktop.
2. Double-click the **Takarivo** shortcut on your Desktop anytime to launch the application.
3. To stop background services, double-click `Stop-Takarivo.bat`.

### Option 2: Run via Terminal
1. Clone the repository:
   ```bash
   git clone https://github.com/mdasifhossain79-ui/takarivo-desktop.git
   cd takarivo-desktop
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your MySQL credentials and JWT secret
4. Import the database schema from the `database/` folder into your MySQL instance.
5. Start the local server:
   ```bash
   npm start
   ```

---

## 📁 Project Structure

```
takarivo-desktop/
├── assets/                  # Icons and media assets
├── css/                     # Modulated CSS stylesheets
├── database/                # MySQL schemas and migration scripts
├── js/                      # Frontend JavaScript modules & controllers
├── netlify/                 # Serverless API functions
│   └── functions/
├── pages/                   # HTML views (dashboard, accounts, budgets, etc.)
├── python/                  # Python financial processing scripts
├── index.html               # Main application entry point
├── Takarivo-App.bat         # Windows desktop launcher
├── Stop-Takarivo.bat        # Background process shutdown utility
└── DESKTOP-APP-GUIDE.md     # Desktop app usage guide
```

---

## 🔒 Security

- `.env` and sensitive local configuration files are excluded from version control.
- Passwords are securely hashed before database persistence.
- Session authorization uses JWT tokens.
