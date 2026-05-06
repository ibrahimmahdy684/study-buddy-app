export const toStudyModeEnum = (ui: string) => ({
  Online: 'ONLINE',
  'In-person': 'IN_PERSON',
  Both: 'BOTH',
}[ui] ?? 'BOTH');

export const fromStudyModeEnum = (val: string) => ({
  ONLINE: 'Online',
  IN_PERSON: 'In-person',
  BOTH: 'Both',
}[val] ?? 'Both');

export const toGroupSizeInt = (label: string) => ({
  '1 (solo)': 1,
  '2-3 people': 2,
  '4-6 people': 4,
  '7+ people': 7,
}[label] ?? 1);

export const fromGroupSizeInt = (val: number) => {
  if (val <= 1) return '1 (solo)';
  if (val <= 3) return '2-3 people';
  if (val <= 6) return '4-6 people';
  return '7+ people';
};

export const toSessionDateTime = (date: string, time: string): string =>
  new Date(`${date}T${time}`).toISOString();

export const toDurationMinutes = (human: string): number => {
  const map: Record<string, number> = {
    '30 minutes': 30, '1 hour': 60, '1.5 hours': 90,
    '2 hours': 120, '3 hours': 180, '4+ hours': 240,
  };
  return map[human] ?? 60;
};

export const fromDurationMinutes = (mins: number): string => {
  if (mins <= 30) return '30 minutes';
  if (mins <= 60) return '1 hour';
  if (mins <= 90) return '1.5 hours';
  if (mins <= 120) return '2 hours';
  if (mins <= 180) return '3 hours';
  return '4+ hours';
};

export const normalizeNotificationType = (type: string) => {
  if (type.includes('match')) return 'match';
  if (type.includes('buddy') || type.includes('request')) return 'request';
  if (type.includes('session')) return 'session';
  if (type.includes('reminder')) return 'reminder';
  return 'session';
};

export const toUIMessage = (msg: any, currentUserId: string) => ({
  id: msg.id,
  from: msg.senderId,
  to: msg.receiverId ?? null,
  content: msg.content,
  timestamp: msg.createdAt,
  read: msg.read ?? false,
  isOwn: msg.senderId === currentUserId,
});
