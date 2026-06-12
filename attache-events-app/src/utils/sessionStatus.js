// Attendee-facing capacity status.
// Attendees see one of three statuses instead of exact numbers; the admin views
// continue to show exact seat counts.
//   Session Full      -> no seats remaining
//   Limited Capacity  -> 75% or more of capacity filled (but not full)
//   Seats Available   -> below 75% filled (or capacity unknown)
const LIMITED_THRESHOLD = 0.75;

export function sessionStatus(session) {
  const capacity = Number(session?.capacity) || 0;
  const remaining = Number(session?.seats_remaining);

  if (capacity > 0 && remaining <= 0) {
    return { key: 'full', label: 'Session Full', color: '#dc2626' };
  }
  if (capacity > 0 && !Number.isNaN(remaining)) {
    const filled = (capacity - remaining) / capacity;
    if (filled >= LIMITED_THRESHOLD) {
      return { key: 'limited', label: 'Limited Capacity', color: '#b45309' };
    }
  }
  return { key: 'available', label: 'Seats Available', color: '#0D7B72' };
}
