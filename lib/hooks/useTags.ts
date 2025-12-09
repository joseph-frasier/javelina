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
<<<<<<< HEAD
  const { addToast } = useToastStore();
=======
  const { showToast } = useToastStore();
>>>>>>> 3753155 (Implement zone tagging system)

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
<<<<<<< HEAD
      addToast('success', 'Tag created successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create tag';
      addToast('error', message);
=======
      showToast('Tag created successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create tag';
      showToast(message, 'error');
>>>>>>> 3753155 (Implement zone tagging system)
    },
  });
}

/**
 * Hook to update a tag
 */
export function useUpdateTag(organizationId: string) {
  const queryClient = useQueryClient();
<<<<<<< HEAD
  const { addToast } = useToastStore();
=======
  const { showToast } = useToastStore();
>>>>>>> 3753155 (Implement zone tagging system)

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
<<<<<<< HEAD
      addToast('success', 'Tag updated successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update tag';
      addToast('error', message);
=======
      showToast('Tag updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update tag';
      showToast(message, 'error');
>>>>>>> 3753155 (Implement zone tagging system)
    },
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag(organizationId: string) {
  const queryClient = useQueryClient();
<<<<<<< HEAD
  const { addToast } = useToastStore();
=======
  const { showToast } = useToastStore();
>>>>>>> 3753155 (Implement zone tagging system)

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
<<<<<<< HEAD
      addToast('success', message);
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete tag';
      addToast('error', message);
=======
      showToast(message, 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete tag';
      showToast(message, 'error');
>>>>>>> 3753155 (Implement zone tagging system)
    },
  });
}

/**
 * Hook to update zone tag assignments
 */
export function useUpdateZoneTags(organizationId: string) {
  const queryClient = useQueryClient();
<<<<<<< HEAD
  const { addToast } = useToastStore();
=======
  const { showToast } = useToastStore();
>>>>>>> 3753155 (Implement zone tagging system)

  return useMutation({
    mutationFn: ({ zoneId, tagIds }: { zoneId: string; tagIds: string[] }) => {
      return tagsApi.updateZoneTags(zoneId, tagIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
<<<<<<< HEAD
      addToast('success', 'Tags updated successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update tags';
      addToast('error', message);
=======
      showToast('Tags updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update tags';
      showToast(message, 'error');
>>>>>>> 3753155 (Implement zone tagging system)
    },
  });
}

/**
 * Hook to reorder tags (batch update display_order)
 */
export function useReorderTags(organizationId: string) {
  const queryClient = useQueryClient();
<<<<<<< HEAD
  const { addToast } = useToastStore();
=======
  const { showToast } = useToastStore();
>>>>>>> 3753155 (Implement zone tagging system)

  return useMutation({
    mutationFn: async (reorderedTags: Tag[]) => {
      // Update display_order for all tags in parallel
      const updates = reorderedTags.map((tag, index) => 
        tagsApi.update(tag.id, { display_order: index })
      );
      await Promise.all(updates);
      return reorderedTags;
    },
<<<<<<< HEAD
    // Optimistically update the UI before the mutation completes
    onMutate: async (reorderedTags: Tag[]) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tags', organizationId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<{ tags: Tag[]; assignments: ZoneTagAssignment[] }>(['tags', organizationId]);

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData(['tags', organizationId], {
          ...previousData,
          tags: reorderedTags,
        });
      }

      // Return context with the previous data for rollback on error
      return { previousData };
    },
    onError: (error: any, _variables, context) => {
      // Roll back to the previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(['tags', organizationId], context.previousData);
      }
      const message = error?.message || 'Failed to reorder tags';
      addToast('error', message);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct server state
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
    },
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to reorder tags';
      showToast(message, 'error');
    },
>>>>>>> 3753155 (Implement zone tagging system)
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
<<<<<<< HEAD
    // Optimistically update the UI before the mutation completes
    onMutate: async ({ tagId, isFavorite }: { tagId: string; isFavorite: boolean }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tags', organizationId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<{ tags: Tag[]; assignments: ZoneTagAssignment[] }>(['tags', organizationId]);

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData(['tags', organizationId], {
          ...previousData,
          tags: previousData.tags.map(tag => 
            tag.id === tagId 
              ? { ...tag, is_favorite: !isFavorite }
              : tag
          ),
        });
      }

      // Return context with the previous data for rollback on error
      return { previousData };
    },
    onError: (error: any, _variables, context) => {
      // Roll back to the previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(['tags', organizationId], context.previousData);
      }
      const { addToast } = useToastStore.getState();
      const message = error?.message || 'Failed to update favorite status';
      addToast('error', message);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct server state
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
    },
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', organizationId] });
    },
    onError: (error: any) => {
      const { showToast } = useToastStore.getState();
      const message = error?.message || 'Failed to update favorite status';
      showToast(message, 'error');
    },
>>>>>>> 3753155 (Implement zone tagging system)
  });
}

