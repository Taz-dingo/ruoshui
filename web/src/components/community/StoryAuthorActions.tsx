import type { PublishedStory } from '@ruoshui/shared';
import { useEffect, useState } from 'react';

import { ApiRequestError, fetchCurrentUser } from '../../community/content-api';
import {
  createPublishedStoryEditDraft,
  deleteOwnedStory,
  unpublishOwnedStory,
} from '../../community/story-author-api';

interface StoryAuthorActionsProps {
  onEdit: (storyId: string) => void;
  onRemoved: (storyId: string) => void;
  story: PublishedStory;
}

type BusyAction = 'edit' | 'unpublish' | 'delete' | null;

function StoryAuthorActions({ onEdit, onRemoved, story }: StoryAuthorActionsProps) {
  const [isAuthor, setIsAuthor] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsAuthor(false);
    setMessage(null);
    void fetchCurrentUser()
      .then((user) => {
        if (!cancelled) setIsAuthor(user?.id === story.author.id);
      })
      .catch(() => {
        if (!cancelled) setIsAuthor(false);
      });
    return () => {
      cancelled = true;
    };
  }, [story.author.id, story.id]);

  if (!isAuthor) return null;

  async function handleEdit() {
    setBusyAction('edit');
    setMessage(null);
    try {
      const draft = await createPublishedStoryEditDraft(story.id);
      onEdit(draft.story.id);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        setMessage('这条 Story 已经有草稿或正在审核的修改。');
      } else {
        setMessage(error instanceof Error ? error.message : '暂时无法编辑这条 Story。');
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUnpublish() {
    if (!window.confirm('确认先把这条 Story 下架？内容不会删除，之后仍可以继续编辑并重新提交。')) return;
    setBusyAction('unpublish');
    setMessage(null);
    try {
      await unpublishOwnedStory(story.id);
      onRemoved(story.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '下架失败。');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm('确认删除这条 Story？当前会先做软删除，不会立即物理清除照片。')) return;
    setBusyAction('delete');
    setMessage(null);
    try {
      await deleteOwnedStory(story.id);
      onRemoved(story.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除失败。');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="mt-6 rounded-[16px] border border-black/[0.055] bg-white/55 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-medium text-black/34">这是你发布的 Story</span>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            className="rounded-full px-2.5 py-1.5 text-black/54 hover:bg-black/[0.045] disabled:opacity-35"
            disabled={busyAction !== null}
            onClick={() => void handleEdit()}
            type="button"
          >
            {busyAction === 'edit' ? '准备中…' : '编辑'}
          </button>
          <button
            className="rounded-full px-2.5 py-1.5 text-black/54 hover:bg-black/[0.045] disabled:opacity-35"
            disabled={busyAction !== null}
            onClick={() => void handleUnpublish()}
            type="button"
          >
            {busyAction === 'unpublish' ? '下架中…' : '下架'}
          </button>
          <button
            className="rounded-full px-2.5 py-1.5 text-[#a04c43] hover:bg-[#fff0ed] disabled:opacity-35"
            disabled={busyAction !== null}
            onClick={() => void handleDelete()}
            type="button"
          >
            {busyAction === 'delete' ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
      {message ? <div className="mt-2 text-[10px] leading-[1.55] text-[#9a493f]">{message}</div> : null}
    </div>
  );
}

export { StoryAuthorActions };
