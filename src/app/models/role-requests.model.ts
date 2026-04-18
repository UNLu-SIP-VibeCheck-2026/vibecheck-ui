export interface RoleCreateRequest {
  name: string;
  permissionIds: number[];
}

export interface RoleUpdateRequest {
  name: string;
  permissionIds: number[];
}
