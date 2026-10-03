"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface UserRatingProps {
  userId: string;
  size?: "sm" | "md";
}

export function UserRating({ userId, size = "sm" }: UserRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRating() {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("rating")
          .eq("reviewee_id", userId);

        if (error) throw error;

        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
          setRating(avg);
          setCount(data.length);
        }
      } catch (err) {
        console.error("Error fetching user rating:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRating();
  }, [userId]);

  if (loading) {
    return <span className="text-[10px] text-muted animate-pulse">Loading rating...</span>;
  }

  if (rating === null) {
    return <span className="text-[10px] text-muted font-bold uppercase tracking-wider">No reviews yet</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <Star className={`fill-[#eab308] text-[#eab308] ${size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5"}`} />
      <span className={`font-bold text-white ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {rating.toFixed(1)}
      </span>
      <span className="text-[10px] text-muted">
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}
