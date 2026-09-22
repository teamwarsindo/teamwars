import { migrateDiscordAccount } from '@/lib/discord/migrate-member';

// Parameter ID dari permintaanmu
const OLD_ACCOUNT_ID = '296917520655581184';
const NEW_ACCOUNT_ID = '1551180553984671820';

const result = await migrateDiscordAccount(OLD_ACCOUNT_ID, NEW_ACCOUNT_ID);
console.log(result);
