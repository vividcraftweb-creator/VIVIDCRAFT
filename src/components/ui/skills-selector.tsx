'use client';

import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JOB_SKILL_GROUPS, ALL_JOB_SKILLS } from '@/constants/job-taxonomy';

interface SkillsSelectorProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function SkillsSelector({ 
  selectedSkills, 
  onSkillsChange, 
  placeholder = "Search and select skills...",
  className 
}: SkillsSelectorProps) {
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState('');

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter(s => s !== skill));
    } else {
      onSkillsChange([...selectedSkills, skill]);
    }
  };

  const handleSkillRemove = (skill: string) => {
    onSkillsChange(selectedSkills.filter(s => s !== skill));
  };

  const filteredSkills = JOB_SKILL_GROUPS.map(category => ({
    ...category,
    skills: category.skills.filter(skill =>
      skill.toLowerCase().includes(skillsSearch.toLowerCase()) &&
      !selectedSkills.includes(skill)
    )
  })).filter(category => category.skills.length > 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected Skills Display */}
      {selectedSkills.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Selected Skills:</p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <div
                key={skill}
                className="flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 rounded-lg px-3 py-1 text-sm"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleSkillRemove(skill)}
                  className="hover:text-primary/70 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Dropdown */}
      <div className="relative">
        <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <input
                type="text"
                placeholder={placeholder}
                value={skillsSearch}
                onChange={(e) => {
                  setSkillsSearch(e.target.value);
                  if (!skillsOpen) setSkillsOpen(true);
                }}
                onClick={() => setSkillsOpen(true)}
                onBlur={() => {
                  // Small delay to allow clicking on dropdown items
                  setTimeout(() => {
                    setSkillsOpen(false);
                  }, 150);
                }}
                className="w-full h-10 px-3 py-2 pr-10 text-sm border border-input bg-background/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="off"
              />
              <ChevronsUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            align="start"
            side="bottom"
            sideOffset={5}
            style={{ width: 'var(--radix-popover-trigger-width)' }}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onMouseDown={(e) => {
              // Prevent input blur when clicking on dropdown
              e.preventDefault();
            }}
          >
            <Command>
              <CommandList>
                <CommandEmpty>No skills found.</CommandEmpty>
                {filteredSkills.map((category) => (
                  <CommandGroup key={category.category} heading={category.category}>
                        {category.skills.map((skill) => (
                          <CommandItem
                            key={skill}
                            value={skill}
                            onSelect={() => {
                              handleSkillToggle(skill);
                              setSkillsSearch('');
                              // Don't close dropdown immediately, let user continue selecting
                            }}
                          >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSkills.includes(skill) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {skill}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-xs text-muted-foreground">
        Search and select from {ALL_JOB_SKILLS.length} remote work skills across {JOB_SKILL_GROUPS.length} categories
      </p>
    </div>
  );
}
