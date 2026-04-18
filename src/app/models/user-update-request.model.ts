export interface UserUpdateRequest {
  username: string;
  name: string;
  lastName: string;
  email: string;
  birthdate: string;
  phoneNumber: string;
  active?: boolean;
  roleId?: number;
}
