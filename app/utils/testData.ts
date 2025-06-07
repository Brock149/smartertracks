// Test data and utility functions for development

export const TEST_ACCESS_CODES = {
  // These should match actual codes in your database
  ADMIN: 'ADMIN123', // Replace with actual admin access code
  TECH: 'TECH456',   // Replace with actual tech access code
};

export const TEST_EMAILS = {
  // For testing - use real emails if possible for verification
  ADMIN: 'admin@example.com',
  TECH: 'tech@example.com',
  // Consider using real email services like:
  // ADMIN: 'admin@yourdomain.com',
  // TECH: 'tech@yourdomain.com',
};

export const TEST_PASSWORDS = {
  DEFAULT: 'password123',
};

// Utility function to validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Development helper - remove in production
export const getTestCredentials = (role: 'admin' | 'tech') => {
  return {
    email: role === 'admin' ? TEST_EMAILS.ADMIN : TEST_EMAILS.TECH,
    password: TEST_PASSWORDS.DEFAULT,
    accessCode: role === 'admin' ? TEST_ACCESS_CODES.ADMIN : TEST_ACCESS_CODES.TECH,
  };
}; 