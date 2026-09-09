export interface TransferAuditDetailsParams {
  teamName: string;
  teamSlug: string;
  targetIgn?: string;
  targetDl?: string;
  targetTag?: string;
  mutation: string;
  roleChanges?: string;
  quotaUsed?: number;
}

export function formatTransferAuditDetails(params: TransferAuditDetailsParams): string[] {
  const {
    teamName,
    teamSlug,
    targetIgn,
    targetDl,
    targetTag,
    mutation,
    roleChanges,
    quotaUsed,
  } = params;

  const points: string[] = [
    `• **Tim:** ${teamName} (\`${teamSlug}\`)`,
  ];

  if (targetIgn || targetDl || targetTag) {
    const targetInfo = [
      targetIgn ? `**${targetIgn}**` : null,
      targetDl ? `(\`${targetDl}\`)` : null,
      targetTag ? targetTag : null,
    ]
      .filter(Boolean)
      .join(' ');
    points.push(`• **Target Pemain:** ${targetInfo}`);
  }

  points.push(`• **Mutasi:** ${mutation}`);

  if (roleChanges) {
    points.push(`• **Perubahan Role:** ${roleChanges}`);
  }

  if (quotaUsed !== undefined) {
    points.push(`• **Kuota Tim:** ${Number(quotaUsed)} / 2 Terpakai`);
  }

  return points;
}
