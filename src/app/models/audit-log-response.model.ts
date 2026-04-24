export interface AuditLogResponse {
  id: number;
  tabla: string;
  operacion: string;
  usuarioDb: string;
  fecha: string;
  datosAnteriores: string;
  datosNuevos: string;
}
