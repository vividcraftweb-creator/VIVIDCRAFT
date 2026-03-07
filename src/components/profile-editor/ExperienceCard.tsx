'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Briefcase, Plus, Edit, Trash2, Save, X, Lightbulb } from 'lucide-react';
import { type ExperienceItem } from '@/types/database.types';
import { CharacterCount } from '@/components/ui/character-count';
import { FIELD_LIMITS, POSITION_EXAMPLES } from '@/types/profile-editor.types';
import { formatCalendarDateToISO, parseFlexibleToCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';

interface ExperienceCardProps {
  items: ExperienceItem[];
  onUpdate: () => void;
}

export default function ExperienceCard({ items, onUpdate }: ExperienceCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    position: '',
    company: '',
    location: '',
    startDate: null as DateValue | null,
    endDate: null as DateValue | null,
    description: '',
    isCurrentRole: false,
  });

  const addMutation = trpc.publicProfile.addExperience.useMutation({
    onSuccess: () => {
      toast.success('Experience added successfully!');
      setIsAdding(false);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to add experience', { description: error.message });
    },
  });

  const updateMutation = trpc.publicProfile.updateExperience.useMutation({
    onSuccess: () => {
      toast.success('Experience updated successfully!');
      setEditingId(null);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to update experience', { description: error.message });
    },
  });

  const deleteMutation = trpc.publicProfile.deleteExperience.useMutation({
    onSuccess: () => {
      toast.success('Experience deleted successfully!');
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to delete experience', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      position: '',
      company: '',
      location: '',
      startDate: null,
      endDate: null,
      description: '',
      isCurrentRole: false,
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (item: ExperienceItem) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData({
      position: item.position,
      company: item.company,
      location: item.location || '',
      startDate: parseFlexibleToCalendarDate(item.startDate),
      endDate: parseFlexibleToCalendarDate(item.endDate),
      description: item.description || '',
      isCurrentRole: !item.endDate, // If no end date, assume it's current role
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          position: formData.position,
          company: formData.company,
          location: formData.location || undefined,
          startDate: formatCalendarDateToISO(formData.startDate),
          endDate: formatCalendarDateToISO(formData.endDate),
          description: formData.description || undefined,
        },
      });
    } else {
      addMutation.mutate({
        position: formData.position,
        company: formData.company,
        location: formData.location || undefined,
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
    if (confirm('Are you sure you want to delete this experience?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Work Experience</h3>
        </div>
        {!isAdding && !editingId && (
          <Button variant="outline" size="sm" onClick={handleAdd} className="glass-button">
            <Plus className="h-4 w-4 mr-1" />
            Add Experience
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="space-y-5 p-4 border border-slate-700 rounded-lg bg-slate-800/30">
          <div className="space-y-2">
            <Label htmlFor="position" className="text-slate-300">Job Title *</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g., Senior Graphic Designer, Marketing Specialist"
              required
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            {/* Position Examples */}
            {formData.position.length < 3 && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Examples: {POSITION_EXAMPLES.slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-slate-300">Company *</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g., Google"
              required
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-slate-300">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., San Francisco, CA"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
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
              <Label htmlFor="endDate" className="text-slate-300">End Date</Label>
              <DatePicker
                value={formData.endDate}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                placeholder="Select when you ended"
                disabled={formData.isCurrentRole}
                minValue={formData.startDate || undefined}
                className="bg-slate-800/50 border-slate-700"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="currentRole"
                  checked={formData.isCurrentRole}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      isCurrentRole: !!checked,
                      endDate: checked ? null : formData.endDate,
                    });
                  }}
                  className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor="currentRole"
                  className="text-sm text-slate-300 cursor-pointer font-normal"
                >
                  I currently work here
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your responsibilities, achievements, and impact..."
              rows={4}
              className="resize-none bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              maxLength={FIELD_LIMITS.EXPERIENCE_DESCRIPTION.max}
            />
            <CharacterCount
              current={formData.description.length}
              max={FIELD_LIMITS.EXPERIENCE_DESCRIPTION.max}
            />
            {formData.description.length > 0 && formData.description.length < 50 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Tip: Add more details about your impact and achievements
              </p>
            )}
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
                : 'Add Experience'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="glass-button">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* List of Experience Items */}
      <div className="space-y-4">
        {items.length === 0 && !isAdding && !editingId && (
          <div className="glass-card p-8 rounded-2xl text-center">
            <Briefcase className="h-12 w-12 text-primary/50 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">No work experience added yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Add your work experience to showcase your expertise and attract clients
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="glass-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Experience
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
                <h4 className="font-semibold text-lg text-white">{item.position}</h4>
                <p className="text-slate-300">{item.company}</p>
                {item.location && (
                  <p className="text-sm text-slate-400">{item.location}</p>
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
