# Deployment Guide

## Docker Deployment on Render

### Prerequisites
1. Docker installed locally (for testing)
2. Render account
3. PostgreSQL database (can be created on Render)

### Local Testing

1. **Test with Docker Compose (recommended)**:
   ```bash
   npm run docker:compose:up
   ```
   This will start:
   - PostgreSQL database on port 5432
   - Next.js app on port 3000
   - WebSocket server on port 3001

2. **Test individual containers**:
   ```bash
   # Build and run main app
   npm run docker:build
   npm run docker:run
   
   # Build WebSocket server
   npm run docker:build:ws
   ```

3. **Stop containers**:
   ```bash
   npm run docker:compose:down
   ```

### Render Deployment

#### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub**
2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Configure Environment Variables**:
   The blueprint will automatically create the database and set most environment variables. You may need to add:
   - OAuth credentials (if using Google/GitHub auth)
   - Custom secrets

#### Option 2: Manual Setup

1. **Create PostgreSQL Database**:
   - Go to Render Dashboard
   - Click "New" → "PostgreSQL"
   - Choose free tier
   - Note the connection string

2. **Deploy Main Application**:
   - Click "New" → "Web Service"
   - Connect your repository
   - Configure:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
     - Environment Variables:
       ```
       DATABASE_URL=postgresql://user:pass@host:port/db
       NEXTAUTH_SECRET=your-secret-key
       NEXTAUTH_URL=https://your-app.onrender.com
       NEXT_PUBLIC_BASE_URL=https://your-app.onrender.com
       ```

3. **Deploy WebSocket Service**:
   - Click "New" → "Web Service" 
   - Connect same repository
   - Use `Dockerfile.websocket`
   - Configure:
     - Dockerfile Path: `./Dockerfile.websocket`
     - Port: 3001

### Environment Variables Setup

#### Required Variables:
```env
# Database
DATABASE_URL=postgresql://username:password@hostname:5432/database_name

# NextAuth
NEXTAUTH_SECRET=generate-a-strong-secret-key
NEXTAUTH_URL=https://your-app-name.onrender.com

# App Configuration
NEXT_PUBLIC_BASE_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-service.onrender.com
```

#### Optional Variables (for OAuth):
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Database Migration

The application will automatically run migrations on startup. If you need to run them manually:

```bash
# In your local environment
npx prisma migrate deploy

# Or via Render shell
npx prisma db push
```

### Monitoring and Logs

1. **Health Check**: Visit `https://your-app.onrender.com/api/health`
2. **Logs**: Check Render dashboard for service logs
3. **Database**: Monitor via Render PostgreSQL dashboard

### Troubleshooting

#### Common Issues:

1. **Database Connection Failed**:
   - Verify DATABASE_URL format
   - Ensure database is running
   - Check network connectivity

2. **Build Failures**:
   - Check Dockerfile syntax
   - Verify all dependencies in package.json
   - Review build logs

3. **WebSocket Connection Issues**:
   - Ensure WebSocket service is deployed
   - Check CORS configuration
   - Verify port configuration

4. **Authentication Issues**:
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Ensure OAuth credentials are correct

### Performance Optimization

1. **Enable Prisma Query Engine**:
   ```env
   PRISMA_QUERY_ENGINE_LIBRARY=query_engine
   ```

2. **Memory Optimization**:
   ```env
   NODE_OPTIONS=--max-old-space-size=1024
   ```

3. **Database Connection Pooling**:
   Add `?connection_limit=5` to DATABASE_URL

### Security Checklist

- [ ] Strong NEXTAUTH_SECRET generated
- [ ] DATABASE_URL uses encrypted connection
- [ ] OAuth redirect URLs configured
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Health check endpoint secured (if needed)

### Scaling Considerations

1. **Database**: Upgrade to paid PostgreSQL plan for better performance
2. **WebSocket**: Consider Redis for session management in multi-instance setup
3. **CDN**: Use Render's CDN for static assets
4. **Monitoring**: Add error tracking (Sentry, etc.)

### Backup Strategy

1. **Database Backups**: Render provides automatic backups for paid plans
2. **Code Backups**: Git repository serves as code backup
3. **Environment Variables**: Document and backup securely

For support, check:
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
