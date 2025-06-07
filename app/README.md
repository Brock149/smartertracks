# SASI Tool Tracker Mobile App

React Native mobile app for HVAC tool tracking, built with Expo and TypeScript.

## Features

- ✅ Supabase Authentication (email/password with company access codes)
- ✅ Secure session persistence with Expo SecureStore
- ✅ Cross-platform (iOS + Android)
- ✅ TypeScript support
- ✅ Native React Native styling (StyleSheet)
- ✅ React Navigation
- 🚧 Tool management (coming soon)
- 🚧 Transaction tracking (coming soon)
- 🚧 Checklist reporting (coming soon)

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Styling**: React Native StyleSheet
- **Navigation**: React Navigation
- **Authentication**: Supabase Auth with company access codes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Expo SecureStore for session persistence

## Project Structure

```
app/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── LoginScreen.tsx
│   ├── SignupScreen.tsx
│   └── HomeScreen.tsx
├── context/            # React contexts
│   └── AuthContext.tsx
├── supabase/           # Supabase configuration
│   └── client.ts
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
│   ├── index.ts
│   └── testData.ts
├── assets/             # Images, fonts, etc.
├── App.tsx             # Main app component
└── .env                # Environment variables
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment variables**:
   The `.env` file is already configured with Supabase credentials.

3. **Start the development server**:
   ```bash
   npm start
   ```

## Running the App

### Development

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web
npm run web
```

### Testing on Device

1. Install the **Expo Go** app on your phone
2. Scan the QR code from the terminal/browser
3. The app will load on your device

## Authentication & Testing

### Company Access Codes

The app requires a **company access code** during signup. Users need:
- Email address
- Password
- **Company access code** (provided by admin)

The access code determines:
- Which company the user joins
- Their role (admin or tech)

### Email Testing Notes

**For @example.com emails:**
- Supabase requires email verification by default
- @example.com is not a real domain, so verification emails won't work
- For testing, consider using:
  - Real email addresses (recommended)
  - Temporary email services
  - Or disable email confirmation in Supabase settings

**Testing with real emails:**
1. Use a real email address for signup
2. Check your email for verification link
3. Click the verification link
4. Return to the app and log in

### Test Data

Check `utils/testData.ts` for sample credentials and access codes for testing.

## Database Integration

The app connects to the same Supabase database as the admin portal:
- All data is scoped by `company_id`
- Users have `admin` or `tech` roles
- Full transaction history tracking
- Tool checklist management
- Company access code validation

## Next Steps

1. **Tool List Screen**: Display company tools with search/filter
2. **Tool Detail Screen**: Show tool info, photos, and history
3. **Transfer Screen**: Move tools between locations/users
4. **Checklist Screen**: Complete tool inspections
5. **Camera Integration**: Take photos for tool documentation

## Development Notes

- Uses React Native StyleSheet for styling (removed NativeWind due to compatibility issues)
- Session persistence handled automatically by Supabase + SecureStore
- Navigation state managed by React Navigation
- All screens are responsive and keyboard-aware
- Company access code validation ensures proper user onboarding 