export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: Pick<User, "id" | "email" | "name">;
}
