export interface ValidatorCreateRequest {
  username: string;
  password: string;
  name: string;
  lastName: string;
  birthdate: string;
}

export interface ValidatorPasswordRotateRequest {
  username: string;
  password: string;
}

export interface ValidatorResponse {
  id: number;
  username: string;
  name: string;
  lastName: string;
  email: string;
  birthdate: string;
  active: boolean;
  assignedEventId: number;
}
