# Hagerstone Lead Scraper v2.0

Search contractors, vendors, and service providers across India using Google Places API.
Data is automatically saved to Supabase so you never search for the same thing twice.

## How It Works

1. User searches "Painter in Ludhiana"
2. App checks Supabase — if data exists, returns instantly
3. If no data, calls Google Places API → gets verified results → saves to Supabase
4. Next time anyone searches same keyword+city, data comes from database (instant)
5. User can also browse all saved data by city/category

## Setup (3 Steps)

### Step 1: Supabase Database

1. Go to https://supabase.com → open your project (or create new)
2. Go to **SQL Editor** → click **New Query**
3. Paste contents of `supabase_setup.sql` → click **Run**
4. Go to **Settings** → **API** → copy:
   - Project URL (e.g. `https://xxxx.supabase.co`)
   - `anon` public key

### Step 2: Google Places API Key

1. Go to https://console.cloud.google.com
2. Create a project (or use existing)
3. Enable **Places API (New)** from APIs & Services
4. Create an API key from Credentials
5. (Optional) Restrict key to Places API only

### Step 3: Run the App

**Backend:**
```bash
cd backend
pip install -r requirements.txt

# Edit .env with your keys:
# GOOGLE_PLACES_API_KEY=your_key
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_KEY=your_anon_key

python run.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Deploy

**Backend on Render:**
1. Push `backend/` to GitHub
2. Render → New Web Service → connect repo
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars: `GOOGLE_PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`

**Frontend on Vercel:**
1. Push `frontend/` to GitHub
2. Vercel → Import → set `VITE_API_URL` to your Render backend URL
3. Deploy

## Free Tier Limits

- **Google Places API**: ~5,000 text searches + ~10,000 detail lookups/month (free)
- **Supabase**: 500MB database, 50K rows, unlimited reads (free)
- **Render**: Free tier available
- **Vercel**: Free tier available

## Data Columns (matching your Excel format)

business_name, company_name, phone, address, city, category, website,
rating, reviews, has_phone, has_website, website_quality_score,
commercial_score, commercial_match, address_quality_score,
relevance_score, final_score, source_url, source
