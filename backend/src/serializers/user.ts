import type { User } from "@prisma/client";

export interface UserJSON {
  id: number;
  email: string;
  username: string | null;
  is_verified: boolean;
}

export function toUserJSON(user: User): UserJSON {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    is_verified: user.isVerified,
  };
}
