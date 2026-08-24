import type { User } from "@prisma/client";

export interface UserJSON {
  id: number;
  email: string;
  username: string | null;
  phone: string;
  address: string;
  role: "renter" | "host" | null;
  is_verified: boolean;
  created_at: string;
}

export function toUserJSON(user: User): UserJSON {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    address: user.address,
    role: user.role,
    is_verified: user.isVerified,
    created_at: user.createdAt.toISOString(),
  };
}
