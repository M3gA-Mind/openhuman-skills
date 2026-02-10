// Telegram Folders API — raw TDLib wrappers for chat folder operations.
import type TdLibClient from '../tdlib-client';

/**
 * Get all chat folders (filters).
 */
export async function getChatFolders(
  client: TdLibClient
): Promise<{ chat_folders?: Record<string, unknown>[]; main_chat_list_position?: number }> {
  const response = await client.send({ '@type': 'getChatFolders' });
  return response as {
    chat_folders?: Record<string, unknown>[];
    main_chat_list_position?: number;
  };
}

/**
 * Create a new chat folder.
 */
export async function createChatFolder(
  client: TdLibClient,
  folder: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await client.send({
    '@type': 'createChatFolder',
    folder,
  });
  return response as Record<string, unknown>;
}

/**
 * Edit an existing chat folder.
 */
export async function editChatFolder(
  client: TdLibClient,
  chatFolderInfoId: number,
  folder: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await client.send({
    '@type': 'editChatFolder',
    chat_folder_id: chatFolderInfoId,
    folder,
  });
  return response as Record<string, unknown>;
}

/**
 * Delete a chat folder.
 */
export async function deleteChatFolder(
  client: TdLibClient,
  chatFolderInfoId: number,
  leaveChatIds: number[] = []
): Promise<void> {
  await client.send({
    '@type': 'deleteChatFolder',
    chat_folder_id: chatFolderInfoId,
    leave_chat_ids: leaveChatIds,
  });
}

/**
 * Get the list of chats in a chat folder.
 */
export async function getChatFolderChats(
  client: TdLibClient,
  chatFolderInfoId: number
): Promise<{ chat_ids?: number[] }> {
  const response = await client.send({
    '@type': 'getChatFolderChats',
    chat_folder_id: chatFolderInfoId,
  });
  return response as { chat_ids?: number[] };
}
