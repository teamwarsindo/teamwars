import { DISCORD_CONFIG } from '@/lib/discord/config';

export { type StaffItem } from './staff-helpers';
export { executeAssignStaff } from './staff-assign-service';
export { executeUnassignStaff } from './staff-unassign-service';
export { executeSwapAssignStaff } from './staff-swap-service';

export function isDiscordAuthorized(interaction: any): boolean {
  const member = interaction?.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return (
    isAdmin ||
    (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
    (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
  );
}
