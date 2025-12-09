'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, type Tag, type ZoneTagAssignment } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

/**
 * Hook to fetch tags and tag assignments for an organization
 * 
 * @param organizationId - The organization ID to fetch tags for
 * @returns React Query result with tags and assignments data
 */
export function useTags(organizationId: string | null) {
  return useQuery({
    queryKey: ['tags', organizationId],
    queryFn: async () => {
      if (!organizationId) return { tags: [], assignments: [] };
      return await tagsApi.list(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook to create a new tag
 */
export function useCreateTag(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: (data: { name: string; color: string }) => {
      return tagsApi.create({
        organization_id: organizationId,
        name: data.name,
        color: data.color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
      showToast('Tag created successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create tag';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to update a tag
 */
export function useUpdateTag(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: {
        name?: string;
        color?: string;
        is_favorite?: boolean;
        display_order?: number;
      };
    }) => {
      return tagsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
      showToast('Tag updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update tag';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: (tagId: string) => {
      return tagsApi.delete(tagId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
      const count = data.zone_assignments_removed;
      const message = count > 0 
        ? `Tag deleted and removed from ${count} zone${count !== 1 ? 's' : ''}`
        : 'Tag deleted successfully';
      showToast(message, 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete tag';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to update zone tag assignments
 */
export function useUpdateZoneTags(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: ({ zoneId, tagIds }: { zoneId: string; tagIds: string[] }) => {
      return tagsApi.updateZoneTags(zoneId, tagIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
      showToast('Tags updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update tags';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to reorder tags (batch update display_order)
 */
export function useReorderTags(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: async (reorderedTags: Tag[]) => {
      // Update display_order for all tags in parallel
      const updates = reorderedTags.map((tag, index) => 
        tagsApi.update(tag.id, { display_order: index })
      );
      await Promise.all(updates);
      return reorderedTags;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to reorder tags';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to toggle tag favorite status
 */
export function useToggleTagFavorite(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, isFavorite }: { tagId: string; isFavorite: boolean }) => {
      return tagsApi.update(tagId, { is_favorite: !isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
    },
    onError: (error: any) => {
      const { showToast } = useToastStore.getState();
      const message = error?.message || 'Failed to update favorite status';
      showToast(message, 'error');
    },
  });
}

