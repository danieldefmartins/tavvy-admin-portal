# TavvY Pros Portal - Railway Deployment Guide

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository with this code
3. Supabase project credentials
4. GoHighLevel API credentials

## Step 1: Connect GitHub to Railway

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select the `tavvy-admin-portal` repository (or your repo name)

## Step 2: Configure Environment Variables

In Railway dashboard, go to your project → **Variables** tab and add:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://scasgwrikoqdwlwlwcff.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGc...` |
| `SUPABASE_DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres` |
| `GHL_API_KEY` | GoHighLevel API key | `eyJhbGc...` |
| `GHL_LOCATION_ID` | GoHighLevel location ID | `e7vdyR8r7Cys9twmOQzp` |
| `NODE_ENV` | Environment | `production` |

### How to Add Variables

1. Click **"+ New Variable"**
2. Enter the variable name and value
3. Repeat for all variables
4. Railway will auto-redeploy after adding variables

## Step 3: Configure Domain

1. In Railway dashboard, go to **Settings** → **Domains**
2. Click **"Generate Domain"** for a free `*.up.railway.app` domain
3. Or click **"Custom Domain"** to add `pros.trytavvy.com`

### Custom Domain Setup (pros.trytavvy.com)

1. In Railway, add custom domain: `pros.trytavvy.com`
2. Railway will show you a CNAME record
3. In your DNS provider (Bluehost/GoDaddy):
   - Add a **CNAME record**
   - Host: `pros`
   - Points to: `[your-app].up.railway.app` (Railway provides this)
4. Wait 5-30 minutes for DNS propagation
5. Railway auto-provisions SSL certificate

## Step 4: Update Supabase Redirect URLs

After deployment, update these in Supabase Edge Function secrets:

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Update `APP_SUCCESS_URL` to: `https://pros.trytavvy.com/signup?payment=success`
3. Update `APP_CANCEL_URL` to: `https://pros.trytavvy.com/`

## Step 5: Verify Deployment

1. Visit your Railway URL or custom domain
2. Test the landing page loads
3. Test "Get Started" button redirects to Stripe
4. Test signup flow after payment
5. Verify GHL contact creation in GoHighLevel

## Monitoring & Logs

- **Logs**: Railway Dashboard → Your Project → **Deployments** → Click deployment → View logs
- **Metrics**: Railway Dashboard → **Metrics** tab
- **Alerts**: Set up in Railway → **Settings** → **Notifications**

## Scaling (When You Grow)

Railway auto-scales, but you can adjust:

1. Go to **Settings** → **Service**
2. Adjust **Memory** and **CPU** limits
3. Enable **Horizontal Scaling** for multiple instances

## Troubleshooting

### Build Fails
- Check logs for error messages
- Ensure `package.json` has correct build scripts
- Verify all dependencies are listed

### App Crashes on Start
- Check environment variables are set
- Look at logs for missing config

### Database Connection Issues
- Verify `SUPABASE_DATABASE_URL` is correct
- Check Supabase is not paused (free tier pauses after inactivity)

## Cost Estimate

| Usage Level | Estimated Cost |
|-------------|----------------|
| Development/Testing | Free tier |
| 1,000-10,000 users/mo | $5-10/mo |
| 10,000-100,000 users/mo | $10-50/mo |
| 100,000+ users/mo | $50-200/mo |

Railway charges based on actual resource usage (CPU, RAM, bandwidth).

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- TavvY Support: [Your support email]
