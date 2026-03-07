/**
 * AI-Powered Screening Analyzer
 * Uses Anthropic Claude to analyze proposal screening answers and rank candidates
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface AnalysisInput {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  screeningQuestions: string[];
  coverLetter: string;
  screeningAnswers: Array<{
    question: string;
    answer: string;
  }>;
}

interface AnalysisResult {
  score: number; // 0-100
  analysis: string;
  strengths: string[];
  concerns: string[];
  recommendation: 'strong_match' | 'good_match' | 'moderate_match' | 'weak_match';
}

export async function analyzeProposal(
  proposalId: string,
  input: AnalysisInput
): Promise<void> {
  try {
    // Prepare the analysis prompt
    const prompt = buildAnalysisPrompt(input);

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const result = parseAnalysisResponse(responseText);

    // Save the analysis to the database
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('Proposal')
      .update({
        aiScore: result.score,
        aiAnalysis: result.analysis,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', proposalId);

    if (updateError) {
      throw new Error('Failed to save AI analysis');
    }
  } catch (error) {
    // Error analyzing proposal
    throw error;
  }
}

function buildAnalysisPrompt(input: AnalysisInput): string {
  const skillsText = input.requiredSkills.length > 0
    ? `\nRequired Skills: ${input.requiredSkills.join(', ')}`
    : '';

  const screeningQA = input.screeningAnswers
    .map((qa, index) => `\nQ${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`)
    .join('\n');

  return `You are an expert recruiter analyzing a freelancer's proposal for a job posting. Your task is to evaluate how well the candidate matches the job requirements based on their screening question answers and cover letter.

JOB DETAILS:
Title: ${input.jobTitle}
Description: ${input.jobDescription}${skillsText}

SCREENING QUESTIONS & ANSWERS:${screeningQA}

COVER LETTER:
${input.coverLetter.substring(0, 1500)}

Please analyze this proposal and provide:
1. An overall relevance score from 0-100 (where 100 is a perfect match)
2. A brief analysis (2-3 sentences) explaining the score
3. Key strengths (2-4 points)
4. Any concerns or gaps (1-3 points, or "None" if no significant concerns)
5. A recommendation: strong_match, good_match, moderate_match, or weak_match

Format your response EXACTLY as follows:
SCORE: [number 0-100]
ANALYSIS: [Your 2-3 sentence analysis]
STRENGTHS:
- [Strength 1]
- [Strength 2]
CONCERNS:
- [Concern 1 or "None"]
RECOMMENDATION: [strong_match/good_match/moderate_match/weak_match]

Be objective and focus on:
- Relevance of experience to the job requirements
- Quality and depth of screening answers
- Communication clarity and professionalism
- Specific skills and tools mentioned
- Understanding of project requirements`;
}

function parseAnalysisResponse(response: string): AnalysisResult {
  try {
    // Extract score
    const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

    // Extract analysis
    const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]+?)(?=STRENGTHS:|$)/i);
    const analysis = analysisMatch ? analysisMatch[1].trim() : 'Analysis not available';

    // Extract strengths
    const strengthsMatch = response.match(/STRENGTHS:\s*([\s\S]+?)(?=CONCERNS:|$)/i);
    const strengths = strengthsMatch
      ? strengthsMatch[1]
          .split('\n')
          .map(s => s.trim().replace(/^-\s*/, ''))
          .filter(s => s.length > 0)
      : ['Candidate shows interest in the position'];

    // Extract concerns
    const concernsMatch = response.match(/CONCERNS:\s*([\s\S]+?)(?=RECOMMENDATION:|$)/i);
    const concerns = concernsMatch
      ? concernsMatch[1]
          .split('\n')
          .map(s => s.trim().replace(/^-\s*/, ''))
          .filter(s => s.length > 0 && !s.toLowerCase().includes('none'))
      : [];

    // Extract recommendation
    const recommendationMatch = response.match(/RECOMMENDATION:\s*(\w+)/i);
    const recommendation = (recommendationMatch?.[1] || 'moderate_match') as AnalysisResult['recommendation'];

    return {
      score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
      analysis,
      strengths,
      concerns,
      recommendation,
    };
  } catch (error) {
    // Error parsing response - return default
    return {
      score: 50,
      analysis: 'Unable to parse AI analysis',
      strengths: [],
      concerns: [],
      recommendation: 'moderate_match',
    };
  }
}
