import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// A fixed, valid bcrypt hash with no real password behind it. Used to make
// "user does not exist" take the same amount of time as "wrong password" -
// otherwise the early-return for a missing user skips bcrypt.compare
// entirely, and the resulting timing gap lets an attacker enumerate valid
// emails by measuring response latency.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO0Ux9V7lQ.o8VaTQfLGvcpNvHc0dxTdW";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPasswordTimingSafe(password: string, passwordHash: string | null | undefined) {
  return bcrypt.compare(password, passwordHash ?? DUMMY_HASH);
}
