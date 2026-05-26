/**
 * Script to create initial admin users
 * Run this file to create thales@psiqueia.com and wesley@psiqueia.com
 * 
 * This is a reference script - the actual creation should be done via Edge Function
 * or directly through Supabase Dashboard for security reasons.
 */

// User 1: Thales (can be psychologist or patient)
const user1 = {
  email: 'thales@psiqueia.com',
  password: '123456',
  fullName: 'Thales',
  userType: 'psychologist', // Can change to 'patient' after login
  phone: '',
};

// User 2: Wesley (can be psychologist or patient)
const user2 = {
  email: 'wesley@psiqueia.com',
  password: '123456',
  fullName: 'Wesley',
  userType: 'patient', // Can change to 'psychologist' after login
  phone: '',
};

/**
 * To create these users, use one of these methods:
 * 
 * METHOD 1: Via Edge Function (Recommended)
 * Call the create-admin-user Edge Function with the user data above
 * 
 * METHOD 2: Via Supabase Dashboard
 * Go to Authentication > Users > Add User
 * Fill in the details and set user_metadata with the additional fields
 * 
 * METHOD 3: Via SQL (if trigger is properly set up)
 * The trigger will automatically create user_profiles when users are created
 */

console.log('Initial users configuration:');
console.log('User 1:', user1);
console.log('User 2:', user2);
console.log('\nInvitation codes have been created in the database:');
console.log('- ADMIN-THALES-2024 (for thales@psiqueia.com)');
console.log('- ADMIN-WESLEY-2024 (for wesley@psiqueia.com)');
console.log('\nThese users can now register using their invitation codes.');
