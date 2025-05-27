# Todo Before Launch

## Security & Configuration
- [ ] Remove test credentials from `supabase.ts` and use environment variables
- [ ] Update CORS settings in Supabase to only allow production domains
- [ ] Review and update RLS policies for production
- [ ] Set up proper environment variables for production
  - [ ] Create `.env.production` files with Supabase prod keys
  - [ ] Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  - [ ] Set up SENDGRID_API_KEY for email functionality
- [ ] Remove any hardcoded API keys or sensitive information
- [ ] Review and update authentication settings in Supabase
  - [ ] Configure proper JWT expiry times
  - [ ] Set up proper password requirements
  - [ ] Configure MFA if needed
- [ ] Set up proper backup and recovery procedures
- [ ] Configure proper rate limiting for API endpoints

## Database
- [ ] Review and optimize database indexes
- [ ] Set up database backups
- [ ] Review and update database schema if needed
- [ ] Test database performance with production-like data volume
- [ ] Configure proper connection pooling settings
- [ ] Set up database monitoring and alerts

## Frontend
- [ ] Update API endpoints to use production URLs
- [ ] Implement proper error handling and user feedback
- [ ] Add loading states for better UX
- [ ] Test responsive design on various devices
- [ ] Implement proper form validation
- [ ] Add proper logging and monitoring
- [ ] Update favicon and app title in index.html
- [ ] Configure proper build optimization in vite.config.ts
- [ ] Set up proper TypeScript strict mode checks
- [ ] Configure proper ESLint rules for production

## Backend
- [ ] Review and update Edge Functions for production
- [ ] Set up proper logging and monitoring
- [ ] Implement rate limiting
- [ ] Review and update API security measures
- [ ] Test API endpoints with production-like load
- [ ] Configure proper CORS settings
- [ ] Set up proper error handling and logging
- [ ] Configure proper database connection pooling

## Testing
- [ ] Perform comprehensive testing of all features
- [ ] Test user authentication and authorization
- [ ] Test database operations and performance
- [ ] Test API endpoints and Edge Functions
- [ ] Perform security testing
- [ ] Test error handling and recovery
- [ ] Test offline functionality
- [ ] Test real-time updates
- [ ] Test file uploads and storage
- [ ] Test email notifications

## Documentation
- [ ] Update API documentation
- [ ] Create user documentation
- [ ] Document deployment procedures
- [ ] Create maintenance and troubleshooting guides
- [ ] Document backup and recovery procedures
- [ ] Create onboarding guide for new developers
- [ ] Document environment variable requirements
- [ ] Create changelog for version tracking

## Deployment
- [ ] Set up production environment
  - [ ] Configure Vercel or Netlify for admin portal
  - [ ] Set up production Supabase project
  - [ ] Configure production database
- [ ] Configure CI/CD pipeline
  - [ ] Set up automated testing
  - [ ] Configure automated deployment
  - [ ] Set up staging environment
- [ ] Set up monitoring and alerting
  - [ ] Configure error tracking
  - [ ] Set up performance monitoring
  - [ ] Configure uptime monitoring
- [ ] Create deployment checklist
- [ ] Plan for zero-downtime deployment
- [ ] Set up proper logging and monitoring
- [ ] Configure proper SSL/TLS certificates
- [ ] Set up proper DNS configuration

## Post-Launch
- [ ] Monitor system performance
- [ ] Gather user feedback
- [ ] Plan for future improvements
- [ ] Set up support procedures
- [ ] Create maintenance schedule
- [ ] Set up regular security audits
- [ ] Plan for scaling infrastructure
- [ ] Create incident response plan
- [ ] Set up regular backup verification
- [ ] Plan for disaster recovery
