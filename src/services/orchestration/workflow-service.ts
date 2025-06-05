import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Workflow, ExecutionResult } from '@/types/workflow';

export class WorkflowService {
  private readonly WORKFLOWS_COLLECTION = 'workflows';
  private readonly EXECUTIONS_COLLECTION = 'workflow_executions';

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'created' | 'updated'>): Promise<Workflow> {
    try {
      const workflowData = {
        ...workflow,
        created: serverTimestamp(),
        updated: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.WORKFLOWS_COLLECTION), workflowData);
      
      return {
        id: docRef.id,
        ...workflow,
        created: new Date(),
        updated: new Date()
      };
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    try {
      const docRef = doc(db, this.WORKFLOWS_COLLECTION, workflowId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        created: data.created?.toDate() || new Date(),
        updated: data.updated?.toDate() || new Date()
      } as Workflow;
    } catch (error) {
      console.error('Error getting workflow:', error);
      return null;
    }
  }

  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<void> {
    try {
      const docRef = doc(db, this.WORKFLOWS_COLLECTION, workflowId);
      const updateData = {
        ...updates,
        updated: serverTimestamp()
      };
      
      // Remove computed fields
      delete updateData.id;
      delete updateData.created;
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      const docRef = doc(db, this.WORKFLOWS_COLLECTION, workflowId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  }

  async listWorkflows(filters?: any): Promise<Workflow[]> {
    try {
      let q = query(
        collection(db, this.WORKFLOWS_COLLECTION),
        orderBy('updated', 'desc')
      );

      if (filters?.enabled !== undefined) {
        q = query(q, where('enabled', '==', filters.enabled));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created: doc.data().created?.toDate() || new Date(),
        updated: doc.data().updated?.toDate() || new Date()
      } as Workflow));
    } catch (error) {
      console.error('Error listing workflows:', error);
      return [];
    }
  }

  async saveExecution(executionResult: ExecutionResult): Promise<void> {
    try {
      await addDoc(collection(db, this.EXECUTIONS_COLLECTION), {
        ...executionResult,
        startTime: executionResult.startTime,
        endTime: executionResult.endTime
      });
    } catch (error) {
      console.error('Error saving execution:', error);
    }
  }

  async getExecutionHistory(workflowId: string, limitCount?: number): Promise<ExecutionResult[]> {
    try {
      let q = query(
        collection(db, this.EXECUTIONS_COLLECTION),
        where('workflowId', '==', workflowId),
        orderBy('startTime', 'desc')
      );

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate()
      } as ExecutionResult));
    } catch (error) {
      console.error('Error getting execution history:', error);
      return [];
    }
  }

  async updateExecutionStats(workflowId: string, result: ExecutionResult): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) return;

      const executions = workflow.metadata.executions + 1;
      const successRate = result.status === 'success' 
        ? (workflow.metadata.successRate * (executions - 1) + 1) / executions
        : (workflow.metadata.successRate * (executions - 1)) / executions;

      const avgRuntime = (workflow.metadata.averageRuntime * (executions - 1) + result.duration) / executions;

      await this.updateWorkflow(workflowId, {
        metadata: {
          ...workflow.metadata,
          executions,
          lastRun: result.endTime || new Date(),
          averageRuntime: avgRuntime,
          successRate
        }
      });
    } catch (error) {
      console.error('Error updating execution stats:', error);
    }
  }
}

export const workflowService = new WorkflowService();