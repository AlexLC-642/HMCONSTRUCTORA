export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
};
