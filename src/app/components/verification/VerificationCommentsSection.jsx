/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react'

import { FIELD_STYLE, formatVerificationDate } from '../../constants/verificationModalConstants'
import Skeleton, { SkeletonStack } from '../common/Skeleton'
import { IconButton, Section, StatusMarker } from './VerificationAtoms'

function CommentSkeleton() {
    return (
        <div className="rounded-md p-3" style={FIELD_STYLE}>
            <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-6" rounded="rounded-md" />
            </div>
            <Skeleton className="h-3 w-full mb-1.5" />
            <Skeleton className="h-3 w-3/5" />
        </div>
    )
}

function CommentCard({ comment, onDelete, userNames }) {
    return (
        <div className="rounded-md p-3" style={FIELD_STYLE}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono tabular-nums text-text-tertiary">
                    {formatVerificationDate(comment.createdAt)}
                </span>
                <IconButton
                    icon="fa-trash"
                    bg="rgba(220, 38, 38, 0.1)"
                    fg="#b91c1c"
                    onClick={() => onDelete(comment.id)}
                    title="Delete comment"
                />
            </div>
            <div className="text-[12.5px] leading-relaxed text-text-primary">{comment.text}</div>
            {comment.author && userNames[comment.author] && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-text-secondary">
                    <i className="fas fa-user text-[9px]" />
                    {userNames[comment.author]}
                </div>
            )}
        </div>
    )
}

function AddCommentComposer({ accentColor, onAddComment }) {
    const [isOpen, setIsOpen] = useState(false)
    const [text, setText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const reset = () => {
        setText('')
        setIsOpen(false)
    }

    const handleSubmit = async () => {
        if (!text.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            await onAddComment(text)
            reset()
        } catch (error) {
            console.error('Failed to add comment:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) {
        return (
            <button type="button"
                onClick={() => setIsOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border-light bg-transparent px-3 py-2 text-[12px] font-medium text-text-secondary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary active:scale-[0.97]"
            >
                <i className="fas fa-plus text-[10px]" />
                Add a comment
            </button>
        )
    }

    return (
        <div className="rounded-md p-3" style={FIELD_STYLE}>
            <textarea
                rows={3}
                placeholder="Write a comment..."
                aria-label="Write a comment"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full resize-none rounded-md px-3 py-2 text-[13px] outline-none bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                autoFocus
            />
            <div className="mt-2 flex justify-end gap-1.5">
                <button type="button"
                    onClick={reset}
                    className="rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-text-secondary transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:bg-bg-tertiary active:scale-[0.97]"
                >
                    Cancel
                </button>
                <button type="button"
                    onClick={handleSubmit}
                    disabled={!text.trim() || isSubmitting}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white transition-[filter] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] disabled:active:scale-100"
                    style={{ background: accentColor }}
                >
                    <i
                        className={`fas ${isSubmitting ? 'fa-spinner animate-dv-spin' : 'fa-paper-plane'} text-[10px]`}
                    />
                    {isSubmitting ? 'Posting' : 'Post comment'}
                </button>
            </div>
        </div>
    )
}

function commentsStatus(comments) {
    if (comments.length === 0) return <StatusMarker tone="info" />
    return <StatusMarker count={comments.length} />
}

function commentsSubtitle(comments) {
    if (comments.length === 0) return 'No prior comments'
    return `${comments.length} prior ${comments.length === 1 ? 'comment' : 'comments'}`
}

/** "Comments" section — read-only with delete actions plus inline composer. Informational. */
export default function VerificationCommentsSection({
    accentColor,
    canAddComment,
    comments,
    expanded,
    isLoadingComments,
    onAddComment,
    onDeleteComment,
    onToggle,
    userNames
}) {
    return (
        <Section
            title="Comments"
            subtitle={commentsSubtitle(comments)}
            status={commentsStatus(comments)}
            expanded={expanded}
            onToggle={onToggle}
        >
            {isLoadingComments ? (
                <SkeletonStack count={2}>{() => <CommentSkeleton />}</SkeletonStack>
            ) : (
                <div className="flex flex-col gap-2">
                    {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-4 text-text-tertiary">
                            <i className="fas fa-comment-slash text-[20px] mb-1.5" />
                            <span className="text-[12.5px]">No comments yet</span>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <CommentCard
                                key={comment.id}
                                comment={comment}
                                onDelete={onDeleteComment}
                                userNames={userNames}
                            />
                        ))
                    )}
                    {canAddComment && <AddCommentComposer accentColor={accentColor} onAddComment={onAddComment} />}
                </div>
            )}
        </Section>
    )
}
