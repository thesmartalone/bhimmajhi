# Bhim Majhi — Firebase Photo/Video Live System

Files:
- index.html       = original website layout, unchanged visually
- style.css        = original CSS separated into a file
- firebase-config.js = your Firebase project config
- app.js           = real-time public gallery
- admin.html       = separate upload/login page
- admin.css        = admin page styling
- admin.js         = Firebase upload + Firestore logic
- firestore.rules  = Firestore security rules
- storage.rules    = Storage security rules

## Firebase Console setup

1. Open your Firebase project: bhimmajhi-573d8.
2. Authentication → Sign-in method → enable Email/Password.
3. Create an Authentication user with the email:
   cutenrml@gmail.com
   Use a strong password.
4. Build → Firestore Database → Create database.
5. Build → Storage → Get started.
6. Paste firestore.rules into Firestore Database → Rules and Publish.
7. Paste storage.rules into Storage → Rules and Publish.

## Upload

Open:
admin.html

Login with the Firebase Authentication admin account, select a photo/video and publish.

The public index.html listens to Firestore in real time, so a newly published post appears without manually editing index.html.

## Important

The public website keeps the same visual design. The uploaded posts are added using the existing gallery-card style.

For production, keep upload permissions restricted. Do not use public write access for Storage/Firestore.
