export interface AuditLogResponse {
  id: number;
  tableName: string;
  operation: string;
  dbUser: string;
  recordId: number;
  oldData: string;
  newData: string;
  createdAt: string;
}
