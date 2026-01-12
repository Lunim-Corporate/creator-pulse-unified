# Creator Pulse - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### 3. Configure Required Services

#### **OpenAI** (Required)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env.local`: `OPENAI_API_KEY=sk-proj-...`

#### **YouTube** (Required)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new API key
3. Enable YouTube Data API v3
4. Add to `.env.local`: `YOUTUBE_API_KEY=AIza...`

#### **Supabase** (Required for saved prompts)
1. Go to https://supabase.com/dashboard
2. Create a new project or use existing
3. Get your URL and service role key from Settings > API
4. Add to `.env.local`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   ```

#### **Perplexity** (Highly Recommended)
1. Go to https://www.perplexity.ai/settings/api
2. Generate an API key
3. Add to `.env.local`: `PERPLEXITY_API_KEY=pplx-...`

**Important:** Without Perplexity, you won't get the market intelligence enrichment that makes this tool enterprise-grade.

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Visit http://localhost:3000

##  Testing the System

### Test 1: Basic Scraping (YouTube Only)

1. Enter a prompt: `"What are filmmakers discussing about AI tools?"`
2. Select mode: **Tabb**
3. Click "Generate Queries"
4. Click "Start Analysis"
5. Wait 20-30 seconds
6. Verify you see:
   - Content Performance Insights
   - Audience Analysis
   - Engagement Targets

### Test 2: Perplexity Enrichment

1. Ensure `PERPLEXITY_API_KEY` is set
2. Run the same test as above
3. Look for:
   - 🌟 "AI-Enhanced" badges on insights
   - Enrichment Status card showing "Perplexity AI: Enabled"
   - More current trends in the analysis

### Test 3: Mode Switching

1. Try the same prompt in both **Tabb** and **Lunim** modes
2. Notice different:
   - Tone of recommendations
   - Types of engagement targets
   - Strategic focus areas

## 📊 Monitoring Performance

### Check Logs

The system logs detailed information:

```
==========================================================
Analysis Request: TABB mode
Posts: 45
Prompt: Yes
Perplexity: Enabled
==========================================================

→ Scraping YouTube...
  ✓ "filmmaker collaboration tools": 25 videos
✓ YouTube complete: 25 total videos

=== Analysis Pipeline Started ===
✓ Validated 25 posts
✓ Perplexity enrichment complete
✓ Extracted 18 engagement targets

✓ Analysis complete in 24531ms
  - Insights: 5
  - Targets: 18
  - Recommendations: 4
==========================================================
```

### Performance Metrics

Good performance indicators:
- Processing time: 20-40 seconds (with Perplexity)
- Processing time: 10-20 seconds (without Perplexity)
- Engagement targets: 15-30 per analysis
- Content insights: 3-7 per analysis

## 🐛 Troubleshooting

### Issue: "OpenAI returned invalid JSON"

**Cause:** LLM returned malformed JSON
**Fix:** This is rare but can happen. Just retry the analysis.

### Issue: "Perplexity enrichment failed"

**Possible causes:**
1. Invalid API key
2. Rate limit exceeded
3. Network issues

**Fix:** 
- Check your Perplexity API key
- Wait 1 minute and retry
- Analysis will continue without enrichment

### Issue: "No data could be collected"

**Causes:**
1. YouTube API key invalid
2. Query generated no results
3. Rate limit hit

**Fix:**
- Verify YouTube API key
- Try a different prompt
- Wait a few minutes

### Issue: "Schema validation failed"

**Cause:** LLM didn't follow the response format
**Fix:** This indicates a prompt engineering issue. Check the console for details.

## 🔧 Advanced Configuration

### Rate Limiting

Adjust in `.env.local`:
```env
RATE_LIMIT_REQUESTS_PER_MINUTE=60  # Increase if you have higher quotas
```

### Cache Duration

```env
CACHE_TTL_MINUTES=30  # Increase to cache longer (saves API costs)
```

### Perplexity Topics

The system extracts 3-7 topics from posts for Perplexity enrichment. To adjust, edit:
`lib/services/PerplexityService.ts` line 158

## 📈 Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Important: Set these in Vercel

```
OPENAI_API_KEY
YOUTUBE_API_KEY
PERPLEXITY_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### Environment Variables to Check

Before deploying, verify all required variables are set:

```bash
npm run verify-env  # If you create this script
```

## 🎯 Usage Best Practices

### For Tabb Mode
- Focus prompts on: collaboration, workflows, team challenges
- Look for: practical pain points, tool discussions
- Engage: filmmakers asking "how do I..." questions

### For Lunim Mode
- Focus prompts on: AI tools, design thinking, innovation
- Look for: strategic discussions, experimentation
- Engage: thought leaders, early adopters

### Prompt Examples

Good prompts:
- "What challenges are indie filmmakers facing with remote collaboration?"
- "How are creative teams using AI in their workflows?"
- "What are the biggest pain points in video production project management?"

Avoid:
- Too broad: "filmmaking"
- Too narrow: "specific software name only"
- Multiple topics: "filmmaking and AI and design and..."

##  Common Mistakes

1. **Not enabling Perplexity** - You're missing the key enhancement!
2. **Too many queries** - Start with 3-5 queries per platform
3. **Ignoring cache** - Repeated identical searches waste API calls
4. **Not checking logs** - Logs tell you exactly what's happening

##  Tips

- **First run takes longer** (cache is empty)
- **Perplexity adds ~15 seconds** but provides huge value
- **Save good prompts** using the save feature
- **YouTube gives best results** currently
- **Check enrichment status** after each analysis

## 📞 Support

If you encounter issues:
1. Check console logs
2. Verify environment variables
3. Test each API key individually
4. Check API quota limits