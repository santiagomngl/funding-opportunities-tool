// Plain wording for the call type. The internal labels ("Type 1" …) are never shown.

import type { FoRecord } from "./types.ts";

export const callTypeWording: Record<FoRecord["call_type"], string> = {
  "Type 1": "TenneT can receive funding",
  "Type 2": "TenneT can take part without receiving funding",
  "Type 3": "TenneT cannot take part, but could benefit through others",
};
