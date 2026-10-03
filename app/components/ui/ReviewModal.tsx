"use client";

import { useState } from "react";
import { X, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "./Button";
import { Alert } from "./Alert";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  revieweeId: string;
  revieweeName: string;
  requestId: string;
  requestType: "campus" | "outside";
  onSubmitSuccess?: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  revieweeId,
  revieweeName,
  requestId,
  requestType,
  onSubmitSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        request_type: requestType,
        request_id: requestId,
        rating,
        comment: comment.trim() || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("You have already reviewed this task.");
        }
        throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSubmitSuccess) onSubmitSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-[2rem] border border-[rgba(255,255,255,0.08)] bg-[#080d16] p-6 space-y-5 shadow-glow">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-1">
          <h3 className="font-display font-bold text-lg text-white">Rate Your Experience</h3>
          <p className="text-xs text-muted">
            How was working with {revieweeName || "your peer"}?
          </p>
        </div>

        {success ? (
          <Alert tone="success" className="text-center">Review submitted successfully! Thank you.</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform active:scale-95"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-[#eab308] text-[#eab308]"
                        : "text-muted opacity-40"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <div className="space-y-1">
              <label htmlFor="review-comment" className="field-label">
                Write a comment (optional)
              </label>
              <textarea
                id="review-comment"
                rows={3}
                maxLength={500}
                placeholder="Tell other students about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 p-3 text-xs font-semibold text-white placeholder-muted focus:border-primary focus:outline-none"
              />
              <div className="text-right text-[9px] text-muted">
                {comment.length}/500 chars
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full uppercase tracking-wider text-xs font-bold py-3 shadow-glow"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-center text-xs font-bold text-muted hover:text-white uppercase tracking-wider transition-colors pt-1"
            >
              Skip for now
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
