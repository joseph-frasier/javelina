// Mock Tags Data for UI Mockup
// This is temporary mock data - will be replaced with real database integration later

export interface Tag {
  id: string;
  name: string;
  color: string;
  isFavorite: boolean;
}

export interface ZoneTagAssignment {
  zoneId: string;
  tagIds: string[];
}

// Predefined color palette for tags (16 colors in 2 rows)
export const TAG_COLORS = [
  // Row 1 - Vibrant colors
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  // Row 2 - Cool & deep colors
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Slate', value: '#64748B' },
];

// Initial mock tags
export const INITIAL_MOCK_TAGS: Tag[] = [
  { id: 'tag-1', name: 'Production', color: '#22C55E', isFavorite: true },
  { id: 'tag-2', name: 'Staging', color: '#EAB308', isFavorite: true },
  { id: 'tag-3', name: 'Development', color: '#3B82F6', isFavorite: true },
  { id: 'tag-4', name: 'US-East', color: '#8B5CF6', isFavorite: true },
  { id: 'tag-5', name: 'US-West', color: '#EC4899', isFavorite: true },
  { id: 'tag-6', name: 'EU', color: '#14B8A6', isFavorite: true },
];

// Initial mock zone-tag assignments (maps zone IDs to their tag IDs)
// In a real app, this would come from the database
export const INITIAL_ZONE_TAG_ASSIGNMENTS: ZoneTagAssignment[] = [
  // These will be populated based on actual zone IDs in the UI
];

// Helper function to get tags for a zone
export function getTagsForZone(zoneId: string, assignments: ZoneTagAssignment[], tags: Tag[]): Tag[] {
  const assignment = assignments.find(a => a.zoneId === zoneId);
  if (!assignment) return [];
  return tags.filter(tag => assignment.tagIds.includes(tag.id));
}

// Helper function to get zones count for a tag
export function getZoneCountForTag(tagId: string, assignments: ZoneTagAssignment[]): number {
  return assignments.filter(a => a.tagIds.includes(tagId)).length;
}

// Helper function to generate a unique ID for new tags
export function generateTagId(): string {
  return `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

