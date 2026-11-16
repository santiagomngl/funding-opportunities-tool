import { closesIn, formatDate, type DeadlineStatus } from "@/lib/format.ts";
import { percentage } from "@/lib/match.ts";

/** The match score as a ring, in the site's blue. The number is never colour-coded. */
export function MatchRing({ score, size = 48 }: { score: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  return (
    <span
      role="img"
      aria-label={`${percentage(score)} match`}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#d9e7f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2780b8"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length * Math.min(Math.max(score, 0), 1)} ${length}`}
        />
      </svg>
      <span aria-hidden="true" className="absolute text-[12px] font-semibold tabular-nums text-[#164d73]">
        {percentage(score)}
      </span>
    </span>
  );
}

/** "Closes in 122 days": amber in the last 30 days, red once every deadline has passed. */
export function DeadlineBadge({ status }: { status: DeadlineStatus }) {
  if (status.kind === "none") return null;
  const className =
    status.kind === "closed"
      ? "bg-[#fbeaea] text-[#a13a3a]"
      : status.days <= 30
        ? "bg-[#fff4dc] text-[#7a4b00]"
        : "bg-[#e7f2fb] text-[#164d73]";
  return (
    <span
      title={status.kind === "open" ? `${status.step}: ${formatDate(status.date)}` : undefined}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}
    >
      {status.kind === "closed" ? "Closed" : closesIn(status.days)}
    </span>
  );
}
