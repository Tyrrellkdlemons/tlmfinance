# Pathways Home - Testing Checklist

## Auth Flow Testing

### 1. Get Started Button Flow
- [ ] Visit http://localhost:8080/pathways.html
- [ ] Click "Get Started" button on landing page
- [ ] TLMAuth modal should appear with sign-in form
- [ ] Sign in with email/password or OAuth
- [ ] After sign-in, should remain on Pathways Home
- [ ] Landing page should show "Enroll in Program" button instead of "Get Started"

### 2. Direct Sign-In Button
- [ ] Visit http://localhost:8080/pathways.html (not signed in)
- [ ] Click "Sign In" button in top navbar
- [ ] TLMAuth modal should appear
- [ ] Sign in successfully
- [ ] Navbar should update to show username and "Sign Out" button
- [ ] Dashboard link should become visible in navbar

### 3. Session Persistence
- [ ] Sign in on pathways.html
- [ ] Refresh the page
- [ ] Should remain signed in
- [ ] Navigate to index.html
- [ ] Should still be signed in (auth state shared)
- [ ] Return to pathways.html
- [ ] Should still be signed in

### 4. Sign Out Flow
- [ ] While signed in, click "Sign Out" button
- [ ] Should be signed out and redirected to landing page
- [ ] Navbar should show "Sign In" button again
- [ ] Dashboard link should be hidden

## Navigation Testing

### 5. Desktop Navigation (width > 920px)
- [ ] Pathways Home link visible in main site nav
- [ ] Dashboard link hidden when not signed in
- [ ] Dashboard link visible when signed in and enrolled
- [ ] All navigation links work correctly
- [ ] Active state highlighting works

### 6. Mobile Navigation (width < 768px)
- [ ] Bottom navigation bar is fixed at bottom
- [ ] 5 nav items visible: Home, Dashboard, Progress, Resources, Profile
- [ ] Icons display correctly
- [ ] Active state highlights current page
- [ ] Safe area insets respected (iOS)
- [ ] Content has bottom padding to avoid overlap

## Enrollment Wizard Testing

### 7. Access Control
- [ ] Cannot access /dashboard without being enrolled
- [ ] Redirected to /enroll when accessing protected routes
- [ ] /enroll page only accessible when signed in
- [ ] Redirected to sign-in if not authenticated

### 8. Enrollment Flow
- [ ] Step 1: Personal Information form displays
- [ ] All required fields validate
- [ ] Can proceed to Step 2
- [ ] Step 2: Housing Status form displays
- [ ] Can go back to Step 1
- [ ] Step 3: Employment Status
- [ ] Step 4: Financial Situation
- [ ] Submit button creates enrollment record
- [ ] Redirected to dashboard after enrollment

## Dashboard Testing

### 9. Dashboard Display
- [ ] Dashboard loads after enrollment
- [ ] Welcome message shows user's name
- [ ] Current quarter displays correctly
- [ ] Progress percentage shows
- [ ] Milestones section displays
- [ ] Financial plan status shows
- [ ] Quick actions are functional

### 10. Data Loading
- [ ] Enrollment data loads from Supabase
- [ ] Quarterly progress loads
- [ ] Financial plan loads (if exists)
- [ ] Milestones load for current quarter
- [ ] Loading states display correctly
- [ ] Error states display if data fails to load

## Real-Time Features

### 11. Real-Time Updates
- [ ] Changes to enrollment reflect in real-time
- [ ] Milestone status updates propagate
- [ ] Coach activities show in real-time (if coach)
- [ ] Notifications display correctly

## Console & Error Checking

### 12. Console Errors
- [ ] No module import errors
- [ ] No Supabase connection errors
- [ ] No router errors
- [ ] No store errors
- [ ] No component rendering errors

### 13. Network Requests
- [ ] Supabase client initializes correctly
- [ ] Auth requests succeed
- [ ] Database queries execute successfully
- [ ] No 404 errors for static assets

## Cross-Browser Testing

### 14. Browser Compatibility
- [ ] Chrome/Edge - All features work
- [ ] Firefox - All features work
- [ ] Safari - All features work
- [ ] Mobile Safari (iOS) - All features work
- [ ] Mobile Chrome (Android) - All features work

## Fixes Implemented

### Auth Integration
✅ Integrated TLMAuth from main site (auth.js)
✅ Fixed Get Started button to trigger TLMAuth modal
✅ Made auth state global and synchronized
✅ Added proper auth change listeners
✅ Removed sessionStorage redirect (no longer needed)

### Navigation
✅ Added auth.js script to pathways.html
✅ Updated auth UI to use TLMAuth instead of manual Supabase
✅ Made store globally available (window.store)
✅ Fixed Get Started button event listener (now attaches after render)

### Component Loading
✅ Fixed landing page route to attach event listeners after rendering
✅ Removed inline scripts that don't execute in innerHTML

## Known Issues to Monitor

1. **Auth.js Portal Integration**: The auth.js creates its own nav portal - ensure it doesn't conflict with Pathways nav
2. **TLMAuth Load Timing**: Added retry logic if TLMAuth not loaded when button clicked
3. **Dual Auth Systems**: Both TLMAuth and Supabase auth listeners active - ensure they don't conflict

## Next Steps

After completing this checklist:
1. Create sample enrollment data for testing
2. Test coach dashboard (requires coach role)
3. Test quarterly check-in flow
4. Test financial plan creation
5. Implement missing milestone components
6. Add error boundary handling
7. Implement offline support enhancements
