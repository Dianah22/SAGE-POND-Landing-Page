const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(); // Initialize Firebase Admin SDK

exports.onCreateUser = functions.auth.user().onCreate((user) => {
  console.log('User created:', user.uid);

  // Generate a secure chatId using crypto module (replace with your preferred method)
  const crypto = require('crypto');
  const chatId = crypto.randomBytes(16).toString('hex');

  // Update user document in Firestore with the generated chatId
  const firestore = admin.firestore();
  return firestore.collection('users').doc(user.uid).update({
    privateChatId: chatId
  });
});
