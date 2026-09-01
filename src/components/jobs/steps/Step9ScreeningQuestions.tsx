'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpCircle, Plus, X, Sparkles } from 'lucide-react';
import type { JobFormData } from '../CreateJobWizard';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

const SUGGESTED_QUESTIONS = [
  "What relevant experience do you have with this type of project?",
  "What is your availability for this project?",
  "Can you provide examples of similar work you've completed?",
  "What is your estimated timeline for completion?",
  "Do you have any questions about the project requirements?",
  "What tools and technologies do you plan to use?",
  "How do you handle revisions and feedback?",
  "Are you available for regular check-ins and updates?",
];

export default function Step9ScreeningQuestions({ formData, updateFormData }: Props) {
  const [newQuestion, setNewQuestion] = useState('');

  const addQuestion = (question: string) => {
    if (!question.trim()) return;
    if (formData.screening_questions.length >= 10) {
      return;
    }

    updateFormData({
      screening_questions: [...formData.screening_questions, question.trim()],
    });
    setNewQuestion('');
  };

  const removeQuestion = (index: number) => {
    updateFormData({
      screening_questions: formData.screening_questions.filter((_, i) => i !== index),
    });
  };

  const addSuggestedQuestion = (question: string) => {
    if (formData.screening_questions.includes(question)) {
      return;
    }
    addQuestion(question);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Screening Questions</h2>
        <p className="text-muted-foreground">
          Ask specific questions to help filter the best candidates
        </p>
      </div>

      {/* Auto Screening Toggle */}
      <div className="glass-card p-5 rounded-xl">
        <div className="flex items-start gap-3">
          <Checkbox
            id="autoScreening"
            checked={formData.auto_screening}
            onCheckedChange={(checked: boolean) => updateFormData({ auto_screening: checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor="autoScreening"
              className="text-base font-medium cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Enable AI-powered screening
            </label>
            <p className="text-sm text-muted-foreground mt-1">
              Vivid Art AI will automatically analyze responses and rank candidates based on relevance
            </p>
          </div>
        </div>
      </div>

      {/* Custom Questions */}
      <div className="space-y-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Your Questions ({formData.screening_questions.length}/10)
        </Label>

        {/* Existing Questions */}
        <div className="space-y-3">
          {formData.screening_questions.map((question, index) => (
            <div key={index} className="glass-card p-4 rounded-xl flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Question {index + 1}</p>
                <p className="text-sm text-muted-foreground mt-1">{question}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {formData.screening_questions.length === 0 && (
            <div className="glass-card p-8 rounded-xl text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No questions added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add custom questions or select from suggestions below
              </p>
            </div>
          )}
        </div>

        {/* Add New Question */}
        {formData.screening_questions.length < 10 && (
          <div className="glass-card p-4 rounded-xl">
            <div className="flex gap-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addQuestion(newQuestion);
                  }
                }}
                placeholder="Type your question..."
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => addQuestion(newQuestion)}
                disabled={!newQuestion.trim()}
                className="glass-button"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {formData.screening_questions.length < 10 && (
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggested Questions
          </Label>

          <div className="grid grid-cols-1 gap-2">
            {SUGGESTED_QUESTIONS.filter(
              (q) => !formData.screening_questions.includes(q)
            ).map((question, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addSuggestedQuestion(question)}
                className="glass-card p-4 rounded-xl text-left hover:border-primary/50 transition-all hover-lift"
              >
                <div className="flex items-start gap-3">
                  <Plus className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <p className="text-sm">{question}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Guidance Card */}
      <div className="glass-card p-5 rounded-xl border-primary/30">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-2">Best Practices</p>
            <ul className="text-muted-foreground space-y-1.5">
              <li>• Ask 3-5 questions for best results</li>
              <li>• Focus on experience, availability, and approach</li>
              <li>• Avoid yes/no questions - ask for detailed responses</li>
              <li>• Questions help you filter serious candidates quickly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
