# AI Scoring System Documentation

## Overview

The AI Scoring System automatically evaluates and ranks job proposals using Claude AI (Anthropic). It analyzes screening question answers, cover letters, and matches them against job requirements to provide an objective score and detailed analysis.

## How It Works

### 1. **Automatic Scoring Trigger**

When a freelancer submits a proposal, the AI scoring is automatically triggered if:
- The job has `autoScreening` enabled
- The proposal includes screening answers (from screening questions)

### 2. **Scoring Process**

Located in: `src/lib/ai/screening-analyzer.ts`

The system:
1. Takes the job details (title, description, required skills, screening questions)
2. Analyzes the freelancer's screening answers and cover letter
3. Uses Claude 3.5 Sonnet to generate:
   - **Score (0-100)**: Objective relevance rating
   - **Analysis**: 2-3 sentence explanation
   - **Strengths**: 2-4 key positive points
   - **Concerns**: Gaps or areas of concern
   - **Recommendation**: strong_match | good_match | moderate_match | weak_match

### 3. **Score Interpretation**

The admin proposals page color-codes scores:
- **🟢 80-100 (Green)**: Excellent match - highly recommended candidates
- **🟡 60-79 (Yellow)**: Good match - qualified candidates worth considering
- **🔴 Below 60 (Red)**: Needs review - may lack key qualifications

## Implementation Details

### Database Schema

```sql
ALTER TABLE "Proposal"
ADD COLUMN "aiScore" INTEGER,           -- 0-100 relevance score
ADD COLUMN "aiAnalysis" TEXT,           -- AI-generated analysis
ADD COLUMN "screeningAnswers" JSONB;    -- [{"question": "...", "answer": "..."}]
```

### Code Location

- **AI Analyzer**: `/src/lib/ai/screening-analyzer.ts`
- **Proposal Creation**: `/src/server/trpc/routers/proposals.supabase.ts` (lines 146-163)
- **Admin Display**: `/src/app/admin/proposals/page.tsx`
- **Detail Modal**: `/src/components/admin/ProposalDetailModal.tsx`

### API Integration

The system uses the Anthropic API with:
- **Model**: claude-3-5-sonnet-20241022
- **Temperature**: 0.3 (for consistent analysis)
- **Max Tokens**: 2000
- **API Key**: Set in `.env` as `ANTHROPIC_API_KEY`

## Enabling AI Scoring for Jobs

To enable AI scoring for a job, the job must have:
1. `autoScreening: true` in the Job table
2. Screening questions configured (`screeningQuestions` array)

When freelancers submit proposals, they answer these questions, and the AI analyzes the responses.

## Testing

### Add Sample Scores

To test the feature with existing proposals:

```bash
npx dotenv-cli -e .env npx tsx scripts/add-sample-ai-scores.ts
```

This adds realistic sample scores (ranging from 35-92) to proposals without scores.

### View Scores

1. Navigate to `/admin/proposals`
2. The "AI Score" column shows color-coded badges
3. Click any proposal to see the full AI analysis in the detail modal

## Example AI Analysis

**Score: 85**

**Analysis:**
"Excellent match for this position. The candidate demonstrates strong relevant experience and provides comprehensive answers to screening questions. Their skills align well with the job requirements and they show clear understanding of the project scope."

**Strengths:**
- Extensive experience with required technologies
- Detailed and thoughtful screening responses
- Clear communication and project understanding
- Portfolio demonstrates relevant work

**Concerns:**
- None significant

**Recommendation:** strong_match

## Benefits

1. **Time Savings**: Quickly identify top candidates without manually reviewing all proposals
2. **Objective Evaluation**: Consistent, bias-free analysis based on qualifications
3. **Better Matches**: Higher likelihood of successful hires through data-driven ranking
4. **Scalability**: Handle high volumes of proposals efficiently

## Cost Considerations

- Each proposal analysis costs approximately $0.001-0.002 (Anthropic API pricing)
- The analysis runs asynchronously and doesn't block proposal submission
- Only runs when autoScreening is enabled, giving control over API usage

## Future Enhancements

Potential improvements:
- Batch processing for existing proposals
- Custom scoring criteria per job
- Integration with applicant tracking features
- Historical scoring trends and analytics
- Feedback loop to improve scoring accuracy

## Troubleshooting

### Scores Show "N/A"

**Causes:**
- Proposals were submitted before AI scoring was implemented
- Job doesn't have `autoScreening` enabled
- No screening questions/answers provided
- API key not configured

**Solutions:**
- Run the sample scores script for testing
- Enable `autoScreening` on jobs
- Ensure screening questions are set up
- Verify `ANTHROPIC_API_KEY` in `.env`

### Scoring Not Triggered

**Check:**
1. Job has `autoScreening: true`
2. Proposal includes `screeningAnswers`
3. `ANTHROPIC_API_KEY` is set correctly
4. Check server logs for errors: `[AI Analysis]`

## Security

- API key stored securely in environment variables
- Analysis runs server-side only
- Results stored in database with proper RLS policies
- No client-side exposure of API keys

## Monitoring

Check server logs for AI analysis activity:
- `[AI Analysis] Error:` - Analysis failures
- `[AI Analysis] Import error:` - Module loading issues

The system gracefully handles failures and continues proposal submission even if AI analysis fails.
