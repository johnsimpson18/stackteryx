export const LANGUAGE_SAFETY_RULES = `
CONTENT RULES — APPLY TO ALL OUTPUT WITHOUT EXCEPTION:

FORBIDDEN PHRASES — never use these or any close variation:
- "guarantee" / "guaranteed" / "guarantees compliance"
- "eliminate risk" / "eliminates all risk" / "risk-free"
- "complete protection" / "fully protected" / "total security"
- "prevent all" / "prevents all attacks" / "stops all threats"
- "100% secure" / "fully secure" / "completely secure"
- "ensure compliance" (replace with: "supports your compliance efforts" or "is designed to align with [framework] requirements")
- "you will never" / "you will always"
- Any fabricated statistics or percentages not provided in the service context (e.g. "reduces breaches by 73%")
- Any claim about specific client outcomes not supported by the provided data

REQUIRED HEDGING FOR SECURITY CLAIMS:
- Use "designed to" / "helps" / "supports" / "reduces the risk of" / "significantly reduces"
- For compliance: "is designed to support [framework] requirements" — never "ensures compliance"
- For threat prevention: "detects and responds to" — never "prevents" or "stops all"
- For outcomes: "aims to" / "is built to" — never absolute outcome guarantees

STAY WITHIN THE PROVIDED CONTEXT:
- Only reference capabilities explicitly listed in the CAPABILITIES section
- Only reference tools and technology from the TECHNOLOGY STACK section
- Only reference outcomes from the OUTCOME STATEMENT — do not invent additional outcomes
- If a field is empty or missing, do not invent content for it — omit that element from the output instead
- Do not add service features, capabilities, or tools not present in the provided data

TONE RULES:
- Write for business decision-makers, not technical audiences
- Confident but honest — strong language is good, overstatement is not
- No buzzword stacking: avoid "cutting-edge," "best-in-class," "world-class," "revolutionary"
- Specific is always better than general — reference the actual outcome statement, not generic security benefits
`;

export const COMPLIANCE_LANGUAGE_OVERRIDE = `
COMPLIANCE LANGUAGE OVERRIDE — THIS SERVICE HAS COMPLIANCE CONTEXT:
This service supports compliance-related outcomes. Apply these additional rules:
- NEVER write "ensures compliance," "guarantees compliance," or "achieves [framework] certification"
- ALWAYS write "is designed to support [framework] requirements" or "helps meet [framework] controls"
- NEVER imply that using this service alone achieves a certification — compliance requires multiple elements
- If asked to describe compliance outcomes, frame as: "supports your [framework] compliance program" or "addresses key [framework] technical controls"
- Remind the reader (in risk_snapshot for proposals, or as a note in enablement) that formal compliance requires a qualified assessor
`;

export function isComplianceFocused(
  outcomeType?: string | null,
  outcomeStatement?: string | null
): boolean {
  if (outcomeType === "compliance") return true;
  const statement = (outcomeStatement ?? "").toLowerCase();
  return (
    statement.includes("hipaa") ||
    statement.includes("cmmc") ||
    statement.includes("soc 2") ||
    statement.includes("compliance")
  );
}
