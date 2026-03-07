'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { GraduationCap, Plus, Edit, Trash2, Save, X, Lightbulb } from 'lucide-react';
import { type EducationItem } from '@/types/database.types';
import { CharacterCount } from '@/components/ui/character-count';
import { FIELD_LIMITS, INSTITUTION_EXAMPLES } from '@/types/profile-editor.types';
import { formatCalendarDateToISO, parseFlexibleToCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';

interface EducationCardProps {
  items: EducationItem[];
  onUpdate: () => void;
}

export default function EducationCard({ items, onUpdate }: EducationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: null as DateValue | null,
    endDate: null as DateValue | null,
    description: '',
  });

  const addMutation = trpc.publicProfile.addEducation.useMutation({
    onSuccess: () => {
      toast.success('Education added successfully!');
      setIsAdding(false);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to add education', { description: error.message });
    },
  });

  const updateMutation = trpc.publicProfile.updateEducation.useMutation({
    onSuccess: () => {
      toast.success('Education updated successfully!');
      setEditingId(null);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to update education', { description: error.message });
    },
  });

  const deleteMutation = trpc.publicProfile.deleteEducation.useMutation({
    onSuccess: () => {
      toast.success('Education deleted successfully!');
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to delete education', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: null,
      endDate: null,
      description: '',
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (item: EducationItem) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData({
      institution: item.institution,
      degree: item.degree || '',
      fieldOfStudy: item.fieldOfStudy || '',
      startDate: parseFlexibleToCalendarDate(item.startDate),
      endDate: parseFlexibleToCalendarDate(item.endDate),
      description: item.description || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          institution: formData.institution,
          degree: formData.degree || undefined,
          fieldOfStudy: formData.fieldOfStudy || undefined,
          startDate: formatCalendarDateToISO(formData.startDate),
          endDate: formatCalendarDateToISO(formData.endDate),
          description: formData.description || undefined,
        },
      });
    } else {
      addMutation.mutate({
        institution: formData.institution,
        degree: formData.degree || undefined,
        fieldOfStudy: formData.fieldOfStudy || undefined,
        startDate: formatCalendarDateToISO(formData.startDate),
        endDate: formatCalendarDateToISO(formData.endDate),
        description: formData.description || undefined,
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this education item?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Education</h3>
        </div>
        {!isAdding && !editingId && (
          <Button variant="outline" size="sm" onClick={handleAdd} className="glass-button">
            <Plus className="h-4 w-4 mr-1" />
            Add Education
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="space-y-5 p-4 border border-slate-700 rounded-lg bg-slate-800/30">
          <div className="space-y-2">
            <Label htmlFor="institution" className="text-slate-300">School / University *</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g., Stanford University"
              required
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            {/* Institution Examples */}
            {formData.institution.length < 3 && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Examples: {INSTITUTION_EXAMPLES.slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="degree" className="text-slate-300">Degree</Label>
              <Input
                id="degree"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                placeholder="e.g., Bachelor's, Master's"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldOfStudy" className="text-slate-300">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                value={formData.fieldOfStudy}
                onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                placeholder="e.g., Computer Science"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-slate-300">Start Date</Label>
              <DatePicker
                value={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                placeholder="Select when you started"
                className="bg-slate-800/50 border-slate-700"
              />
              <p className="text-xs text-slate-500">Select when you started</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-slate-300">End Date (or expected)</Label>
              <DatePicker
                value={formData.endDate}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                placeholder="Select graduation date"
                minValue={formData.startDate || undefined}
                className="bg-slate-800/50 border-slate-700"
              />
              <p className="text-xs text-slate-500">Leave blank if currently enrolled</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your achievements, courses, activities..."
              rows={3}
              className="resize-none bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              maxLength={FIELD_LIMITS.EDUCATION_DESCRIPTION.max}
            />
            <CharacterCount
              current={formData.description.length}
              max={FIELD_LIMITS.EDUCATION_DESCRIPTION.max}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending}
              className="glass-button"
            >
              <Save className="h-4 w-4 mr-2" />
              {addMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingId
                ? 'Save Changes'
                : 'Add Education'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="glass-button">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* List of Education Items */}
      <div className="space-y-4">
        {items.length === 0 && !isAdding && !editingId && (
          <div className="glass-card p-8 rounded-2xl text-center">
            <GraduationCap className="h-12 w-12 text-primary/50 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">No education added yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Add your educational background to demonstrate your qualifications
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="glass-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Education
            </Button>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-white">{item.institution}</h4>
                {item.degree && item.fieldOfStudy && (
                  <p className="text-slate-300">
                    {item.degree} in {item.fieldOfStudy}
                  </p>
                )}
                {(item.degree && !item.fieldOfStudy) && (
                  <p className="text-slate-300">{item.degree}</p>
                )}
                {(!item.degree && item.fieldOfStudy) && (
                  <p className="text-slate-300">{item.fieldOfStudy}</p>
                )}
                {item.startDate && item.endDate && (
                  <p className="text-sm text-slate-400">
                    {item.startDate} - {item.endDate}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  disabled={isAdding || editingId !== null}
                  className="glass-button"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteMutation.isPending || isAdding || editingId !== null}
                  className="glass-button"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
