import type { AlumniIdentity, PublishedStoryAuthor } from "@ruoshui/shared";

interface PublicAuthorFields {
  authorId: string;
  avatarObjectKey: string | null;
  department: string | null;
  displayName: string | null;
  enrollmentYear: number | null;
  graduationYear: number | null;
  major: string | null;
}

function avatarUrl(userId: string, avatarObjectKey: string | null): string | null {
  return avatarObjectKey ? `/api/users/${encodeURIComponent(userId)}/avatar` : null;
}

function alumniIdentity(fields: PublicAuthorFields): AlumniIdentity | null {
  if (
    fields.enrollmentYear === null &&
    fields.graduationYear === null &&
    fields.department === null &&
    fields.major === null
  ) {
    return null;
  }

  return {
    enrollmentYear: fields.enrollmentYear,
    graduationYear: fields.graduationYear,
    department: fields.department,
    major: fields.major,
  };
}

function mapPublicAuthor(fields: PublicAuthorFields): PublishedStoryAuthor {
  return {
    id: fields.authorId,
    displayName: fields.displayName,
    avatarUrl: avatarUrl(fields.authorId, fields.avatarObjectKey),
    alumniIdentity: alumniIdentity(fields),
  };
}

export { mapPublicAuthor };
export type { PublicAuthorFields };
