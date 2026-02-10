// Telegram Users API — raw TDLib wrappers for user-related operations.
import type TdLibClient from '../tdlib-client';
import type { TdUserFull } from '../types';

/**
 * Get the currently authenticated user.
 */
export async function getMe(client: TdLibClient): Promise<TdUserFull> {
  const response = await client.send({ '@type': 'getMe' });
  return response as unknown as TdUserFull;
}

/**
 * Get user info by ID.
 */
export async function getUser(client: TdLibClient, userId: number): Promise<TdUserFull | null> {
  try {
    const response = await client.send({ '@type': 'getUser', user_id: userId });
    return response as unknown as TdUserFull;
  } catch {
    return null;
  }
}

/**
 * Get full user info (bio, common groups count, etc.).
 */
export async function getUserFullInfo(
  client: TdLibClient,
  userId: number
): Promise<Record<string, unknown> | null> {
  try {
    const response = await client.send({ '@type': 'getUserFullInfo', user_id: userId });
    return response as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Load the user's saved contacts from TDLib.
 */
export async function getContacts(client: TdLibClient): Promise<TdUserFull[]> {
  const response = await client.send({ '@type': 'getContacts' });
  const userIds = (response as { user_ids?: number[] }).user_ids || [];
  const users: TdUserFull[] = [];

  for (const userId of userIds) {
    const user = await getUser(client, userId);
    if (user) users.push(user);
  }

  return users;
}

/**
 * Search for a user by username (without the leading @).
 */
export async function searchPublicChat(
  client: TdLibClient,
  username: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await client.send({ '@type': 'searchPublicChat', username });
    return response as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Block a user.
 */
export async function blockUser(client: TdLibClient, userId: number): Promise<void> {
  await client.send({
    '@type': 'toggleMessageSenderIsBlocked',
    sender_id: { '@type': 'messageSenderUser', user_id: userId },
    is_blocked: true,
  });
}

/**
 * Unblock a user.
 */
export async function unblockUser(client: TdLibClient, userId: number): Promise<void> {
  await client.send({
    '@type': 'toggleMessageSenderIsBlocked',
    sender_id: { '@type': 'messageSenderUser', user_id: userId },
    is_blocked: false,
  });
}

/**
 * Add a user as a saved contact.
 */
export async function addContact(
  client: TdLibClient,
  contact: { userId: number; firstName: string; lastName?: string; phoneNumber?: string }
): Promise<void> {
  await client.send({
    '@type': 'addContact',
    contact: {
      '@type': 'contact',
      user_id: contact.userId,
      first_name: contact.firstName,
      last_name: contact.lastName || '',
      phone_number: contact.phoneNumber || '',
    },
    share_phone_number: false,
  });
}

/**
 * Remove saved contacts by user IDs.
 */
export async function removeContacts(client: TdLibClient, userIds: number[]): Promise<void> {
  await client.send({ '@type': 'removeContacts', user_ids: userIds });
}
