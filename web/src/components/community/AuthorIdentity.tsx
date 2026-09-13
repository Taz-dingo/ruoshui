import type { AlumniIdentity, PublishedStoryAuthor } from '@ruoshui/shared';

import { cn } from '../../utils/cn';

interface AuthorIdentityProps {
  author: PublishedStoryAuthor;
  className?: string;
  compact?: boolean;
  tone?: 'glass' | 'paper';
}

function fallbackAuthorName(author: PublishedStoryAuthor) {
  return author.displayName ?? `若水用户 ${author.id.slice(-4).toUpperCase()}`;
}

function alumniLabel(identity: AlumniIdentity | null): string | null {
  if (!identity) return null;

  const parts: string[] = [];
  if (identity.enrollmentYear !== null) {
    parts.push(`${identity.enrollmentYear} 级`);
  } else if (identity.graduationYear !== null) {
    parts.push(`${identity.graduationYear} 届`);
  }

  const department = identity.department?.trim();
  const major = identity.major?.trim();
  if (department) parts.push(department);
  if (major && major !== department) parts.push(major);

  return parts.length > 0 ? parts.join(' · ') : null;
}

function AuthorAvatar({ author, tone }: Pick<AuthorIdentityProps, 'author' | 'tone'>) {
  const fallback = fallbackAuthorName(author).trim().slice(0, 1).toUpperCase() || '若';
  const glass = tone === 'glass';

  if (author.avatarUrl) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn(
          'h-full w-full rounded-full object-cover',
          glass ? 'bg-white/12' : 'bg-black/[0.045]',
        )}
        loading="lazy"
        src={author.avatarUrl}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-full w-full place-items-center rounded-full font-semibold',
        glass ? 'bg-white/12 text-white/72' : 'bg-black/[0.045] text-black/48',
      )}
    >
      {fallback}
    </span>
  );
}

function AuthorIdentity({
  author,
  className,
  compact = false,
  tone = 'paper',
}: AuthorIdentityProps) {
  const alumni = alumniLabel(author.alumniIdentity);
  const glass = tone === 'glass';

  if (compact) {
    return (
      <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
        <span className="h-5 w-5 shrink-0 overflow-hidden rounded-full text-[9px]">
          <AuthorAvatar author={author} tone={tone} />
        </span>
        <span className="min-w-0 truncate">
          <span className={cn('font-medium', glass ? 'text-white/74' : 'text-black/58')}>
            {fallbackAuthorName(author)}
          </span>
          {alumni ? (
            <span className={cn('ml-1.5', glass ? 'text-white/42' : 'text-black/32')}>
              · {alumni}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full text-[11px]">
        <AuthorAvatar author={author} tone={tone} />
      </span>
      <span className="min-w-0">
        <span className={cn('block truncate text-[12px] font-medium', glass ? 'text-white/84' : 'text-black/68')}>
          {fallbackAuthorName(author)}
        </span>
        {alumni ? (
          <span className={cn('mt-0.5 block truncate text-[10px]', glass ? 'text-white/46' : 'text-black/36')}>
            {alumni}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export { AuthorIdentity, alumniLabel, fallbackAuthorName };
