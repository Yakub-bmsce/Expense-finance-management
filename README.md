# Smart Shared Expense Tracker (FlatSplit Pro)

## 1. Project Overview
Smart Shared Expense Tracker (FlatSplit Pro) is a modern, dark-mode-first web application designed for roommates, flatmates, and group living arrangements to seamlessly track and split shared expenses. It helps bachelors, students, and families manage shared household finances, communicate balances, and automate settle-ups without the friction of manual spreadsheets. Featuring intelligent bill splitting, room administration, multi-room connections, and AI-driven spending insights, FlatSplit Pro simplifies shared living financial management.

## 2. Full Feature List

### Authentication
* **Email & Password Authentication**: Standard email/password registration and login.
* **Google OAuth**: Fast login and sign-up integration using Google accounts.
* **Demo Login**: A pre-seeded demo account for quick testing and evaluation without registration.
* **Forgot Password Flow**: Secure password recovery via token-based email reset.
* **JWT-Based Auth**: Secure session management using JSON Web Tokens (JWT) stored in HTTP-only, SameSite cookies.
* **"Remember Me" Session Persistence**: Keeps users logged in on return visits until they explicitly log out.
* **Protected Routes**: Middleware to guard frontend and backend routes from unauthorized access.

### Onboarding Flow
* **Profile Builder (First Signup Only)**: Collects Full Name, Gender, Age, College, Mobile (optional), and Profile Photo (optional).
* **Living Type Selection**: Choice between "Bachelor" or "Family" living configurations.
* **Bachelor Living Categorization**: Classifies user living situation into PG, Hostel, or Flat.
* **Flat Room Specification**: Determines flat size by asking for the number of rooms (1 / 2 / 3 / Custom).
* **Smooth Page Transitions**: Visual animations guiding users through steps instead of instant jumps.

### Room System
* **Room Creation**: Generates a unique Room ID and a secure, random Room Join Code.
* **Room Joining**: Input interface to enter a Room Join Code, validating and linking the user to the corresponding room.
* **Room Creator Assignment**: Automatically assigns the room creator as the room's Admin.
* **Room Isolation (Initial Phases)**: Restricts membership to a single room.

### Admin System
* **Invite Members**: Displays and shares the active Room Join Code.
* **Remove Members**: Allows admins to evict users from the room.
* **Regenerate Join Code**: Instantly invalidates the active Room Join Code and generates a new one to prevent unauthorized access.
* **Admin Limit**: Restricts rooms to a maximum of 3 connected admins to prevent administrative gridlocks.
* **Room Archival & Deletion**: Administrative tools to archive or delete a room.

### Multi-Room Connection
* **Room Linking**: Connects multiple separate rooms together (e.g., in a large shared house, student co-ops, or PG complex).
* **Shared Expense Channels**: Creates custom expense lists shared across linked rooms.
* **Inter-Room Balance Sheets**: Visualizes and handles balances between connected rooms.

### Expense System
* **Expense Logging**: Add, edit, and delete expenses (using soft deletes to preserve financial logs).
* **Categorization & Tagging**: Assigns expenses to categories (Rent, Groceries, Utilities, Entertainment, Others) with custom tags.
* **Private Expenses**: Logs personal expenditures that remain strictly invisible to other room members and do not affect group balances.
* **Receipt Attachments**: Uploads and associates files/images with specific expense logs.
* **Change Logs**: Keeps a detailed audit trail of all creations, updates, and deletes of expense records.

### Bill Splitting
* **Splitting Mechanisms**: Split options including Equal, Unequal, Percentages, Shares, and Itemized splits.
* **Exclusion Control**: Excludes specific members from select room bills.
* **Debt Simplification Engine**: Computes the minimum number of payment transactions required to settle all room debts.
* **Payment Log & Verification**: Records and confirms settle-ups between members.

### Notifications
* **Real-Time Alerts**: In-app notifications for new expenses, comments, and member activities.
* **Email Summaries**: Monthly financial roundups and pending settle-up digests.
* **Push Notifications**: Optional browser alerts for urgent payment requests.
* **User Preferences**: Configuration panel to toggle different notification channels.

### Dashboard
* **Bento-Grid Layout**: High information density layout showcasing critical metrics (balances, updates, members).
* **Quick Action Controls**: Direct access to add expenses, settle up, and share join codes.
* **Interactive Data Visualization**: Charts showing monthly expenditure trends and category distributions.
* **Real-Time Balance Display**: Dynamic widget with glassmorphism styling and micro-animations on balance changes.

### Search
* **Full-Text Search**: Searches descriptions, notes, and comments across all logged expenses.
* **Advanced Filters**: Filters expenses by date range, category, payer, involved members, and amount range.

### Reports
* **Exportable Formats**: Exports room activity logs and balance sheets as PDF and CSV files.
* **Individual vs. Group Visualizations**: Visual comparison comparing personal spending against group totals.
* **Historical Comparisons**: Analytics comparing month-over-month or quarter-over-quarter metrics.

### AI Features
* **AI Receipt Parser (OCR)**: Automatically extracts merchant, transaction date, tax, and total amount from uploaded receipts.
* **AI Spending Insights**: Analyzes patterns to detect unusual budget spikes and suggests cost-saving adjustments.
* **Natural Language Queries**: Allows users to query room data using normal text (e.g., "How much did we spend on electricity last month?").

## 3. Technology Stack
* **Frontend**: React.js, Tailwind CSS
* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL
* **Auth**: JSON Web Tokens (JWT), Google OAuth 2.0
* **Storage**: Cloud Object Storage (for profiles and receipt uploads)
* **Deployment**: Vercel (Frontend), Render (Backend), Neon (Postgres Database)

## 4. Database Schema

### Users Table (`users`)
* `id` (UUID, Primary Key)
* `email` (VARCHAR, Unique, Indexed)
* `password_hash` (VARCHAR, Nullable for OAuth users)
* `google_id` (VARCHAR, Nullable, Indexed)
* `full_name` (VARCHAR)
* `gender` (VARCHAR)
* `age` (INTEGER)
* `college` (VARCHAR)
* `mobile` (VARCHAR, Nullable)
* `profile_photo_url` (VARCHAR, Nullable)
* `living_type` (VARCHAR: 'bachelor' | 'family')
* `living_details` (JSONB: stores PG/Hostel/Flat info, including room counts)
* `created_at` (TIMESTAMP)
* `updated_at` (TIMESTAMP)

### Rooms Table (`rooms`)
* `id` (UUID, Primary Key)
* `name` (VARCHAR)
* `join_code` (VARCHAR, Unique, Indexed)
* `created_at` (TIMESTAMP)
* `updated_at` (TIMESTAMP)

### Room Members Table (`room_members`)
* `id` (UUID, Primary Key)
* `room_id` (UUID, Foreign Key -> rooms.id, Indexed)
* `user_id` (UUID, Foreign Key -> users.id, Indexed)
* `role` (VARCHAR: 'admin' | 'member')
* `joined_at` (TIMESTAMP)
* `UNIQUE(room_id, user_id)`

### Expenses Table (`expenses`)
* `id` (UUID, Primary Key)
* `room_id` (UUID, Foreign Key -> rooms.id, Nullable for private expenses, Indexed)
* `payer_id` (UUID, Foreign Key -> users.id, Indexed)
* `description` (VARCHAR)
* `amount` (DECIMAL(12, 2))
* `category` (VARCHAR)
* `receipt_url` (VARCHAR, Nullable)
* `is_private` (BOOLEAN, Default: false)
* `created_at` (TIMESTAMP)
* `updated_at` (TIMESTAMP)
* `deleted_at` (TIMESTAMP, Nullable - used for soft deletes, Indexed)

### Expense Splits Table (`expense_splits`)
* `id` (UUID, Primary Key)
* `expense_id` (UUID, Foreign Key -> expenses.id, Indexed)
* `user_id` (UUID, Foreign Key -> users.id, Indexed)
* `share_amount` (DECIMAL(12, 2))
* `is_settled` (BOOLEAN, Default: false)
* `settled_at` (TIMESTAMP, Nullable)
* `UNIQUE(expense_id, user_id)`

### Room Connections Table (`room_connections`)
* `id` (UUID, Primary Key)
* `parent_room_id` (UUID, Foreign Key -> rooms.id, Indexed)
* `child_room_id` (UUID, Foreign Key -> rooms.id, Indexed)
* `status` (VARCHAR: 'pending' | 'approved')
* `created_at` (TIMESTAMP)
* `UNIQUE(parent_room_id, child_room_id)`

### Audit Logs Table (`audit_logs`)
* `id` (UUID, Primary Key)
* `entity_type` (VARCHAR: 'expense' | 'room' | 'user')
* `entity_id` (UUID, Indexed)
* `action` (VARCHAR: 'create' | 'update' | 'delete')
* `changed_by` (UUID, Foreign Key -> users.id)
* `previous_state` (JSONB, Nullable)
* `new_state` (JSONB, Nullable)
* `created_at` (TIMESTAMP)

## 5. Design Language
* **Dark-Mode-First**: Obsidian black and deep slate base tones with high-contrast electric blue and neon purple accent highlights.
* **Glassmorphism Cards**: Core content container cards utilize frosted-glass properties (`backdrop-blur-md`), subtle light borders (`border-white/10`), and deep shadow depth.
* **Micro-Animations**: Smooth scale and color transitions for balance modifications, hover highlights, and navigation switches.
* **Bento-Grid Dashboard**: Content layouts organized in modular, rectangular cells of varying dimensions to present financial stats cleanly.
* **Rounded Soft-Shadow UI**: UI components use soft borders (`rounded-2xl` / `rounded-3xl`) paired with ambient blur drop-shadows.
* **Custom Empty States**: Illustrated vector empty-states for scenes indicating empty rooms, no transaction history, or search result drops.

## 6. Development Phases
* **Phase 1**: Authentication, Onboarding, Single-Room Creation/Joining, and Basic Admin Controls.
* **Phase 2**: Core Expense Tracking, Receipt Uploads, and Basic/Advanced Bill Splitting Logic.
* **Phase 3**: Real-Time Notifications, Bento-Grid Dashboard, Search, and CSV/PDF Reporting.
* **Phase 4**: Multi-Room Connections, Admin Expansion (up to 3 admins), and Security Consensus Rules (unanimous delete).
* **Phase 5**: AI Integration (Receipt OCR Parser, Spending Insights, and Natural Language Queries).

## 7. Known Constraints & Rules
* **Admin Limit**: Each room is constrained to a maximum of 3 active administrators.
* **Unanimous Room Deletion**: Deletion or permanent archival of a room requires unanimous approval from all connected room administrators.
* **Private Expense Isolation**: Expenses flagged as private must never be synchronized, visible, or accessible to other members in the room.
* **Strict Soft-Deletion**: No financial records or change logs are hard-deleted; database deletions must use a `deleted_at` timestamp for audit compliance.
* **Single Room Constraint (Phases 1-3)**: Users can belong to exactly one active room at a time; multi-room connections are restricted until Phase 4.
* **Mandatory Onboarding Gate**: The profile onboarding questionnaire is enforced strictly upon the user's first login and must be completed to access room features.
* **Creator Admin Assignment**: The user who initializes a room is automatically assigned the role of Admin.
* **Join Code Invalidation**: Regenerating a room's join code invalidates the older code immediately, preventing new member links via the outdated code.
* **JWT Cookie Security**: Token sessions must be saved via HTTP-only, secure, SameSite cookies to mitigate XSS and CSRF vectors.

## 8. Current Status
* **Phase 1 — Not Started**
