import { MatchScheduleItem } from '@/app/tournament/_library';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

export interface MatchContextResult {
  teamA: any;
  teamB: any;
  kodeTimA: string;
  kodeTimB: string;
  roleAId: string;
  roleBId: string;
  campChannelAId: string;
  campChannelBId: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  calculatedWeek: string;
}

export interface BaseLogPayload {
  channelId: string;
  matchId: string;
  weekName: string;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji?: string;
  teamBEmoji?: string;
  matchChannelId?: string;
  matchDateIso?: string;
}

export interface ExecuteAssignParams {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
  targetStaffId: string;
}

export interface ExecuteAssignResult {
  match: MatchScheduleItem;
  staffName: string;
  replacedStaffName?: string;
}

export interface ExecuteUnassignParams {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
}

export interface ExecuteUnassignResult {
  match: MatchScheduleItem;
  targetStaffName: string;
}

export interface ExecuteSwapParams {
  matchAId: string;
  matchBId: string;
  assignType: 'REFEREE' | 'STREAMER';
}

export interface ExecuteSwapResult {
  matchA: MatchScheduleItem;
  matchB: MatchScheduleItem;
  staffAName: string;
  staffBName: string;
}
