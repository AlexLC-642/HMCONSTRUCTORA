import { cookies } from "next/headers";
import { prisma } from "@/shared/lib/prisma";
import { verifySessionToken } from "./session";
import type { AuthenticatedUser } from "../domain/types";

type UserRoleWithPermissions = {
  role: {
    key: string;
    permissions: Array<{
      permission: {
        key: string;
      };
    }>;
  };
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.sub,
      status: "ACTIVE"
    },
    select: {
      id: true,
      email: true,
      name: true,
      roles: {
        select: {
          role: {
            select: {
              key: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      key: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  const userRoles = user.roles as UserRoleWithPermissions[];
  const roles = userRoles.map((item) => item.role.key);
  const permissions = new Set<string>();

  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
    permissions: [...permissions]
  };
}