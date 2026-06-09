export interface Achievement {
  id: number;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}
