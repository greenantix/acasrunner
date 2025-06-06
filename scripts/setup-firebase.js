const fs = require('fs').promises;
const path = require('path');

async function setupFirebase() {
  console.log('🔥 Setting up Firebase integration for leo...\n');

  try {
    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    
    try {
      await fs.access(envPath);
      console.log('✅ Found .env.local file');
    } catch {
      console.log('❌ .env.local file not found');
      console.log('📝 Creating .env.local template...');
      
      const envTemplate = `# Firebase Server Configuration (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# Firebase Client Configuration (from Firebase console)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# leo Local Configuration
leo_LOCAL_DB_PATH=./data/leo_vectors.db
leo_LM_STUDIO_URL=http://localhost:1234
leo_CACHE_SIZE=1000
`;
      
      await fs.writeFile(envPath, envTemplate);
      console.log('✅ Created .env.local template');
    }

    // Check if firebase-admin is installed
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    const requiredPackages = ['firebase-admin'];
    const missingPackages = requiredPackages.filter(pkg => 
      !packageJson.dependencies?.[pkg] && !packageJson.devDependencies?.[pkg]
    );

    if (missingPackages.length > 0) {
      console.log('❌ Missing required packages:', missingPackages.join(', '));
      console.log('💻 Run: npm install firebase-admin');
    } else {
      console.log('✅ Firebase packages are installed');
    }

    // Check if Firestore security rules exist
    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    
    try {
      await fs.access(rulesPath);
      console.log('✅ Firestore security rules found');
    } catch {
      console.log('📝 Copying Firestore security rules...');
      
      const sourcePath = path.join(process.cwd(), 'firestore-security-rules.rules');
      try {
        const rulesContent = await fs.readFile(sourcePath, 'utf8');
        await fs.writeFile(rulesPath, rulesContent);
        console.log('✅ Firestore security rules copied');
      } catch {
        console.log('⚠️  Could not copy security rules. Please manually copy firestore-security-rules.rules to firestore.rules');
      }
    }

    console.log('\n🎉 Firebase setup complete!\n');
    console.log('📋 Next steps:');
    console.log('1. Update .env.local with your Firebase credentials');
    console.log('2. Deploy Firestore security rules: firebase deploy --only firestore:rules');
    console.log('3. Enable Authentication providers in Firebase console');
    console.log('4. Start your development server: npm run dev');
    console.log('\n📚 For detailed setup instructions, see CLAUDE.md');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupFirebase();
}

module.exports = setupFirebase;
