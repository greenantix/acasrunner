import { useState, useEffect, useCallback } from 'react';
import { useFirebaseAuth } from './use-firebase-auth';

interface Project {
  id: string;
  projectId: string;
  name: string;
  description: string;
  ownerUid: string;
  collaborators: Record<string, string>;
  settings: {
    autoIndex: boolean;
    filePatterns: string[];
    excludePatterns: string[];
    embeddingModel: string;
  };
  indexingStatus: {
    totalFiles: number;
    indexedFiles: number;
    lastIndexed: Date | null;
    status: 'indexing' | 'completed' | 'error' | 'pending';
  };
  createdAt: Date;
  updatedAt: Date;
}

export function useFirebaseProjects() {
  const { getAuthHeaders, user } = useFirebaseAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/firebase/projects', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const { projects } = await response.json();
        setProjects(projects);
      } else {
        setError('Failed to fetch projects');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (projectData: { name: string; description?: string }) => {
    try {
      setError(null);

      const response = await fetch('/api/firebase/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const { projectId } = await response.json();
        await fetchProjects(); // Refresh the list
        return projectId;
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to create project');
        return null;
      }
    } catch (err) {
      setError('Network error');
      return null;
    }
  }, [getAuthHeaders, fetchProjects]);

  const updateProject = useCallback(async (projectId: string, updateData: any) => {
    try {
      setError(null);

      const response = await fetch(`/api/firebase/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchProjects(); // Refresh the list
        return true;
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to update project');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  }, [getAuthHeaders, fetchProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/firebase/projects/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        await fetchProjects(); // Refresh the list
        return true;
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to delete project');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    }
  }, [getAuthHeaders, fetchProjects]);

  const syncProjectMetadata = useCallback(async (projectId: string, stats: any) => {
    try {
      const response = await fetch('/api/firebase/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          type: 'project_metadata',
          data: { projectId, stats },
        }),
      });

      return response.ok;
    } catch (err) {
      console.error('Failed to sync project metadata:', err);
      return false;
    }
  }, [getAuthHeaders]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    syncProjectMetadata,
  };
}
