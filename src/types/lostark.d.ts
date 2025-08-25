// src/types/lostark.d.ts

export interface LostarkNotice {
  Title: string;
  Date: string;
  Link: string;
  Thumbnail: string;
}

export interface LostarkEvent {
  Title: string;
  Thumbnail: string;
  Link: string;
  StartDate: string;
  EndDate: string;
  RewardDate: string | null;
}

export interface LostarkAlarmItem {
  AlarmType: string;
  Contents: string;
  StartDate: string;
  EndDate: string | null;
}

export interface LostarkAlarmResponse {
  RequirePolling: boolean;
  Alarms: LostarkAlarmItem[];
}

export interface GameContentRewardItem {
  Name: string;
  Icon: string;
  Grade: string;
  StartTimes?: string[];
}

export interface GameContentItemLevel {
  ItemLevel: number;
  Items: GameContentRewardItem[];
}

export interface LostarkGameContent {
  CategoryName: string;
  ContentsName: string;
  ContentsIcon: string;
  MinItemLevel: number;
  StartTimes: string[];
  Location: string;
  RewardItems: GameContentItemLevel[];
}