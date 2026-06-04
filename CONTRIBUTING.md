# Contributing to TypeForge AI ⌨️🐙

First off, thank you for considering contributing to TypeForge AI! It is people like you who make open source a wonderful place to learn, inspire, and build. 

Any contribution you make — whether it is fixing a small styling bug, adding a new developer mode language, or improving our telemetry models — is highly appreciated.

---

## 🏗️ Technical Stack

- **Frontend**: Compile-less Vanilla HTML5, CSS3 Custom Properties, and ES Module JavaScript (Vanilla Web APIs, no heavy framework wrappers).
- **Backend API**: Asynchronous Python FastAPI, jwt-validation, Turnstile middleware.
- **Database**: Supabase PostgreSQL.
- **Machine Learning**: Scikit-Learn, XGBoost, LightGBM, and Isolation Forests.

---

## ⚡ Quick Start (Local Development)

### 1. Frontend Setup
The frontend consists of static files in the root directory. You can run it locally with any simple HTTP server:
```bash
# Using Node.js npx:
npx serve .

# Or using Python's built-in server:
python -m http.server 8000
```
Then navigate to `http://localhost:8000`.

### 2. Backend Setup
The FastAPI server lives in the `backend/` directory.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Copy `.env.example` to `.env` and fill in your Supabase connection strings, Clerk API keys, and Turnstile secrets:
   ```bash
   cp .env.example .env
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will run on `http://localhost:8000`. The frontend requests are proxied via `vercel.json` rewrite paths when deployed, or handled directly by relative API paths (`/api/v1/*`) in development.

---

## 📂 Repository Structure

- `index.html`, `features.html`, `about.html`, `blog.html`, `feedback.html` — Core landing pages.
- `css/` — Stylesheets. Components are decoupled: `global.css` (tokens), `components.css` (navbar/buttons), `typing.css` (typing interface).
- `js/` — Shared ES Module script assets (`common.js` contains the `PerformanceManager`).
- `app/` — Main application workspace (typing interface, dashboard, charts).
- `backend/` — FastAPI core, ML scripts, database schema, and endpoint routers.

---

## 🛠️ Performance & Spacing Guidelines

To maintain our buttery-smooth, lag-free performance (60 FPS on all devices) and compact visual aesthetic:

1. **Keep Pages Compact**: Avoid adding huge vertical margins or block paddings. Rely on variables like `.section-pad` (configured via CSS variables) to keep layouts tight.
2. **Free Memory**: If you create animations or telemetry loggers, ensure they are registered with the `PerformanceManager` in `js/common.js`. Suspended/offscreen components must freeze their updates.
3. **No Unsafe Inline Scripts**: TypeForge uses strict Content Security Policy (CSP) headers. All scripts must be loaded from `'self'` or whitelisted domains. Never write inline JavaScript in HTML tag attributes (like `onclick="foo()"`), prefer using `addEventListener` in JS modules.

---

## 🚀 Submitting Your Changes

1. **Fork the Repository**: Create your own copy of this project on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-new-feature
   ```
3. **Make Your Changes**: Ensure your code conforms to Python PEP 8 (backend) and ESLint conventions (frontend). Verify local server runtimes.
4. **Commit Your Work**: Make descriptive, clear commit messages:
   ```bash
   git commit -m "feat: add Go language to developer typing mode"
   ```
5. **Push to Your Fork**:
   ```bash
   git push origin feature/amazing-new-feature
   ```
6. **Open a Pull Request**: Submit your pull request to our `main` branch. Briefly describe the changes, what problem you solved, and how you tested it.

---

## 💬 Communication & Support

If you have questions, feel free to open a discussion, file a bug report, or suggest a new feature on the [Feedback Page](https://typeforge.fun/feedback.html).

Thank you for contributing to TypeForge AI! ⌨️
