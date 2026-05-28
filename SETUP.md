# HA RAG System - Setup Instructions

## 🚨 **CRITICAL FIXES APPLIED**

Your system had several critical issues that have been fixed:

1. **✅ Pinecone API Deprecation Fixed** - Updated from `pc.Index()` to `pc.index()`
2. **✅ Security Issues Fixed** - Removed exposed API keys from `.env`
3. **✅ CORS Configuration Secured** - Restricted origins instead of allowing all
4. **✅ Environment Validation Added** - Server now validates required environment variables

## 🔧 **Setup Instructions**

### 1. **Configure Environment Variables**

**IMPORTANT**: Your API keys have been removed for security. You need to add them back:

1. Copy your actual API keys to the `.env` file:
   ```bash
   cd backend
   # Edit .env file with your actual credentials
   ```

2. Required environment variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string_here
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   PINECONE_API_KEY=your_pinecone_api_key_here
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

### 2. **Install Dependencies**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. **Test Pinecone Connection**

```bash
cd backend
node test_pinecone.js
```

You should see: "Pinecone connection successful!"

### 4. **Start the Application**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🔍 **What Was Wrong**

### **Critical Issues Fixed:**

1. **Pinecone API Deprecation** 🔧
   - **Problem**: Using deprecated `pc.Index()` constructor
   - **Fix**: Updated to `pc.index()` method
   - **Files**: `test_pinecone.js`, `vectorService.js`

2. **Exposed API Keys** 🚨
   - **Problem**: Real API keys committed to repository
   - **Fix**: Replaced with placeholders, added to `.gitignore`
   - **Security Risk**: HIGH - Anyone with repo access had your keys

3. **Insecure CORS** 🛡️
   - **Problem**: CORS allowed all origins (`"*"`)
   - **Fix**: Restricted to specific frontend domains
   - **Security Risk**: MEDIUM - Could allow unauthorized access

4. **No Environment Validation** ⚠️
   - **Problem**: Server would start with missing environment variables
   - **Fix**: Added validation that checks for required variables on startup

### **System Architecture:**
- **Backend**: Node.js/Express with MongoDB, Pinecone, OpenAI
- **Frontend**: React 19 with Vite, TailwindCSS
- **Features**: PDF upload, RAG chat, workspaces, authentication

## 🚀 **Next Steps**

1. **Add your API keys** to the `.env` file
2. **Test the Pinecone connection** with `node test_pinecone.js`
3. **Start both servers** and test the application
4. **Consider adding** rate limiting, request validation, and monitoring

## 🔒 **Security Recommendations**

1. **Never commit** `.env` files to version control
2. **Use strong JWT secrets** (at least 32 characters)
3. **Restrict CORS** to your actual frontend domains
4. **Add rate limiting** for API endpoints
5. **Validate all inputs** on the backend
6. **Monitor API usage** to detect abuse

## 📞 **Need Help?**

If you encounter issues:
1. Check that all environment variables are set correctly
2. Verify your API keys are valid and have proper permissions
3. Ensure MongoDB, Pinecone, and OpenAI services are accessible
4. Check the console for specific error messages

Your system should now be working properly! 🎉