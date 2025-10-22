# Sign in methods functionality

## Overview

Add complete functionality to the Password & Authentication section with modals for email/password management and OAuth integration for Google/GitHub sign-in methods.

## Components to Create

### 1. ChangePasswordModal component

**File**: `components/modals/ChangePasswordModal.tsx`

- Modal matching GitHub's design from the reference image
- Fields: Old password, New password, Confirm new password
- Password visibility toggles (show/hide icons)
- Password requirements text: "Make sure it's at least 15 characters OR at least 8 characters including a number and a lowercase letter"
- "Update password" button and "I forgot my password" link
- "Hide" button in header to close modal
- Validation: passwords match, meets requirements
- Use Supabase `auth.updateUser()` to change password
- Toast notifications for success/error

### 2. ManageEmailModal component

**File**: `components/modals/ManageEmailModal.tsx`

- Display current email(s) with verification status
- Add new email option
- Verify/remove email actions
- Primary email designation
- Use Supabase email management functions

## Update Settings Page

**File**: `app/settings/page.tsx`

### State Management

- Add state for modal visibility (email modal, password modal)
- Add state for OAuth connection status (isGoogleConnected, isGithubConnected)
- Fetch user's linked identities from Supabase on mount

### Button Handlers

**Email "Manage" button**:

- Open ManageEmailModal

**"Change password" button**:

- Open ChangePasswordModal

**Google/GitHub "Connect" buttons**:

- Check if user already has a social provider connected (prevent multiple)
- If none connected: Initiate Supabase OAuth with `signInWithOAuth()`
- If already connected: Show "Disconnect" and handle unlinking via `unlinkIdentity()`
- Update button text based on connection status
- Toast notification if trying to connect second social provider

### OAuth Flow Implementation

- Use Supabase `auth.signInWithOAuth()` for Google/GitHub
- Set redirect URL back to settings page
- Handle OAuth callback
- Update connection status in UI

### Connection Status Display

- Change button from "Connect" to "Disconnect" when provider is linked
- Disable other social provider's connect button if one is already connected
- Show visual indicator (e.g., checkmark, different styling) for connected providers

## Supabase Integration Points

**Password change**: `supabase.auth.updateUser({ password: newPassword })`

**OAuth connection**: `supabase.auth.signInWithOAuth({ provider: 'google' | 'github' })`

**Unlink provider**: `supabase.auth.unlinkIdentity({ provider: 'google' | 'github' })`

**Get linked identities**: `supabase.auth.getUser()` - check user.identities array

**Email management**: `supabase.auth.updateUser({ email: newEmail })`

## Validation & Error Handling

- Password requirements validation
- Confirm password matches new password
- Check for existing social provider before connecting another
- Handle OAuth errors (user cancels, network issues)
- Toast notifications for all actions

## Files to Modify

1. Create: `components/modals/ChangePasswordModal.tsx`
2. Create: `components/modals/ManageEmailModal.tsx`  
3. Update: `app/settings/page.tsx` - Add state, handlers, modals
4. May need: Helper functions for OAuth status checking

## Implementation Status

✅ **Completed**:
- Created ChangePasswordModal component with GitHub-style design
- Created ManageEmailModal component for email management
- Implemented OAuth connection/disconnection handlers for Google and GitHub
- Added state management for tracking OAuth provider connections
- Updated Connect/Disconnect button states based on connection status
- Added password validation and social provider restriction logic
- All authentication flows tested and working

