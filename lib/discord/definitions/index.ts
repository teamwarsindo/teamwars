import { staffCommands } from './staff';
import { tournamentCommands } from './tournament';
import { rosterCommands } from './roster';
import { adminCommands } from './admin';

export const ALL_SLASH_COMMANDS = [
  ...staffCommands,
  ...tournamentCommands,
  ...rosterCommands,
  ...adminCommands,
];
