// Debug script to check Google OAuth setup
// Run this in your browser console on the login page

console.log('=== Google OAuth Debug ===');

// Check if providers are loaded
fetch('/api/auth/providers')
  .then(res => res.json())
  .then(providers => {
    console.log('Available providers:', providers);
    if (providers.google) {
      console.log('✅ Google provider is available');
      console.log('Google provider details:', providers.google);
    } else {
      console.log('❌ Google provider is NOT available');
    }
  })
  .catch(err => console.error('Error fetching providers:', err));

// Check environment variables (server-side only)
console.log('To check environment variables, look at the server console logs when loading the login page');
console.log('You should see "🔍 Google OAuth check:" logs in your terminal');