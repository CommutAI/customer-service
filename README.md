# CommutAI Customer Service System

A comprehensive React + TypeScript + Vite application for managing QR cards, transactions, and customer service operations for a public transportation system.

## 🚀 Features

### Core Functionality

#### **Dashboard**
- Real-time statistics and KPIs
- Today's registrations, top-ups, transactions, and revenue
- Interactive charts for weekly transactions and revenue
- Card type distribution visualization
- Quick action shortcuts to major features

#### **QR Card Management**
- Issue new QR cards with a 3-step registration wizard
- Support for multiple passenger types:
  - **Regular** - Standard fare
  - **Student** - Discounted student fare
  - **Senior Citizen** - Senior citizen discount
  - **PWD** - Persons with disability discount
- Card activation and deactivation
- Card replacement for lost/damaged cards
- Edit card holder information
- Visual QR code generation and display
- Card template preview during registration

#### **Temporary QR Cards**
- Generate temporary cards with ₱100 initial balance
- Same passenger type support as regular cards
- Card top-up functionality
- Deactivate temporary cards
- Print temporary cards
- Visual card preview with QR code overlay

#### **Card Reload/Top-up**
- Reload cards with predefined amounts (₱50, ₱100, ₱200, ₱500, ₱1000)
- Custom amount input
- Real-time card validation and suggestions
- Passenger type display
- Current balance display
- Cash collection instructions
- Receipt generation with print functionality
- Recent reloads history

#### **Transaction History**
- View all transaction records
- Search by passenger name or transaction ID
- Filter by date range (daily, monthly, yearly, custom)
- Transaction type indicators (top-up, fare, ticket purchase)
- Balance tracking
- Payment method display

#### **Reports & Analytics**
- Comprehensive reporting dashboard
- Time-based filtering (weekly, monthly, yearly, custom)
- Revenue and transaction trend charts
- Card type distribution analysis
- Transaction type breakdown
- Card status distribution (active, disabled, lost)
- Export functionality
- Visual pie charts and line graphs

#### **Passenger Management**
- Search passengers by name, phone, or card ID
- Filter by card type (All, Temporary, Regular, Student, Senior Citizen, PWD)
- View passenger details and card information
- Replace lost/damaged cards
- Issue new cards for existing passengers
- Balance and status tracking

### Technical Features

#### **Authentication & Authorization**
- Secure staff authentication via Supabase Auth
- Role-based access control (admin, conductor, cs_desk)
- Staff profile management
- Sign-out functionality

#### **Database Integration**
- Supabase PostgreSQL backend
- Comprehensive schema with:
  - Staff users and roles
  - Buses and routes
  - QR cards with multiple types
  - Temporary cards
  - Transactions
  - Trips and routes
  - Passenger records
  - Audit logs

#### **UI/UX**
- Modern glassmorphism design
- Responsive layout with collapsible sidebar
- Dark theme optimized for customer service environments
- Real-time data updates with React Query
- Loading states and error handling
- Modal dialogs for complex operations
- Toast notifications for user feedback

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.2.7
- **Language**: TypeScript 6.0.2
- **Build Tool**: Vite 8.1.1
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack React Query 5.101.2
- **Routing**: React Router DOM 7.18.1
- **Styling**: Tailwind CSS 4.3.2
- **Charts**: Recharts 3.10.1
- **QR Code Generation**: qrcode.react 4.2.0
- **Icons**: Lucide React 1.24.0
- **HTTP Client**: Axios 1.18.1

## 📋 Setup

### Prerequisites
- Node.js (18 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/CommutAI/customer-service.git
cd customer-service
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings.

4. **Set up the database**
Run the database schema in your Supabase SQL Editor:
- Open `supabase/schema.sql`
- Copy and execute the entire script in Supabase SQL Editor
- This will create all necessary tables, functions, and triggers

5. **Run the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🗄️ Database Schema

The system uses a comprehensive PostgreSQL schema with the following main tables:

- **staff_users** - Staff authentication and roles
- **buses** - Bus fleet management
- **qr_cards** - Regular QR card issuance and tracking
- **temporary_qr_cards** - Temporary card management
- **transactions** - All financial transactions
- **passengers** - Passenger information
- **trips** - Trip records and tracking
- **routes** - Route information
- **audit_logs** - System activity logging

## 🚦 Usage

### First Time Setup

1. **Create Staff Account**
   - Sign up through the authentication system
   - Assign appropriate role (admin, conductor, cs_desk)

2. **Issue First QR Card**
   - Navigate to QR Cards page
   - Click "Issue New Card"
   - Fill in passenger information
   - Select passenger type
   - Confirm and generate card

3. **Process Card Reload**
   - Navigate to Reload Card page
   - Enter card ID
   - Select reload amount
   - Collect cash from passenger
   - Process reload

### Daily Operations

1. **Check Dashboard**
   - View today's statistics
   - Monitor revenue and transaction trends

2. **Issue Cards**
   - Register new passengers
   - Generate QR cards
   - Print cards for distribution

3. **Reload Cards**
   - Process card top-ups
   - Generate receipts
   - Track reload history

4. **Monitor Transactions**
   - Review transaction history
   - Search specific transactions
   - Filter by date range

5. **Generate Reports**
   - View analytics dashboard
   - Analyze card distribution
   - Export reports as needed

## 🔒 Security Features

- Supabase Row Level Security (RLS) policies
- Role-based access control
- Secure authentication flow
- Audit logging for all critical operations
- Input validation and sanitization

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers (1920x1080 and above)
- Tablets (768px and above)
- Mobile devices (with horizontal scrolling for tables)

## 🎨 Design System

- **Color Scheme**: Dark theme with glassmorphism effects
- **Primary Color**: Orange (#f97316)
- **Secondary Colors**: Blue, Green, Purple for different card types
- **Typography**: System fonts with optimized readability
- **Components**: Custom glass-card components with backdrop blur

## 🔄 Data Flow

1. **Card Issuance**: Staff → API → Database → QR Generation
2. **Card Reload**: Staff → API → Database → Transaction Record
3. **Transaction Processing**: Conductor → API → Database → Balance Update
4. **Reporting**: Database → API → Analytics Dashboard

## 🐛 Troubleshooting

### Common Issues

**Build fails with "Module not found" errors**
- Ensure all dependencies are installed: `npm install`
- Check that image files exist in `src/assets/`

**Supabase connection errors**
- Verify `.env.local` file is correctly configured
- Check Supabase project is active
- Ensure database schema is properly set up

**Authentication not working**
- Verify Supabase Auth is enabled
- Check email confirmation settings
- Ensure staff user has correct role

## 📝 Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is proprietary software for CommutAI.

## 📞 Support

For support and questions, please contact the CommutAI development team.

---

**Built with ❤️ for CommutAI Public Transportation System**
