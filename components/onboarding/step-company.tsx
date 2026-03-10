"use client";

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "200+"];

const GEOGRAPHIES = [
  "North America",
  "EMEA",
  "APAC",
  "LATAM",
  "Global",
];

interface StepCompanyProps {
  companyName: string;
  founderName: string;
  founderTitle: string;
  companySize: string;
  geographies: string[];
  onCompanyNameChange: (v: string) => void;
  onFounderNameChange: (v: string) => void;
  onFounderTitleChange: (v: string) => void;
  onCompanySizeChange: (v: string) => void;
  onGeographiesChange: (v: string[]) => void;
}

export function StepCompany({
  companyName,
  founderName,
  founderTitle,
  companySize,
  geographies,
  onCompanyNameChange,
  onFounderNameChange,
  onFounderTitleChange,
  onCompanySizeChange,
  onGeographiesChange,
}: StepCompanyProps) {
  const toggleGeo = (geo: string) => {
    onGeographiesChange(
      geographies.includes(geo)
        ? geographies.filter((g) => g !== geo)
        : [...geographies, geo]
    );
  };

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1
          className="text-4xl font-bold uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "#FFFFFF", fontSize: 36 }}
        >
          LET&apos;S BUILD YOUR STACKTERYX
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ fontFamily: "var(--font-mono-alt)", color: "#666666", fontSize: 14 }}
        >
          First, tell us about your company.
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Company Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder="Your MSP or company name"
          className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#444]"
          style={{
            backgroundColor: "#111111",
            borderColor: "#1E1E1E",
            color: "#FFFFFF",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#A8FF3E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; }}
        />
      </div>

      {/* Your Name */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Your Name
        </label>
        <input
          type="text"
          value={founderName}
          onChange={(e) => onFounderNameChange(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#444]"
          style={{
            backgroundColor: "#111111",
            borderColor: "#1E1E1E",
            color: "#FFFFFF",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#A8FF3E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; }}
        />
      </div>

      {/* Your Title */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Your Title
        </label>
        <input
          type="text"
          value={founderTitle}
          onChange={(e) => onFounderTitleChange(e.target.value)}
          placeholder="e.g. CEO, CTO, Director of Security"
          className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#444]"
          style={{
            backgroundColor: "#111111",
            borderColor: "#1E1E1E",
            color: "#FFFFFF",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#A8FF3E"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#1E1E1E"; }}
        />
      </div>

      {/* Company Size */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Company Size
        </label>
        <div className="grid grid-cols-4 gap-3">
          {COMPANY_SIZES.map((size) => {
            const selected = companySize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onCompanySizeChange(selected ? "" : size)}
                className="rounded-lg border px-4 py-3 text-sm font-medium transition-[border-color,background-color] duration-100"
                style={{
                  backgroundColor: selected ? "rgba(168, 255, 62, 0.06)" : "#111111",
                  borderColor: selected ? "#A8FF3E" : "#1E1E1E",
                  color: selected ? "#A8FF3E" : "#CCCCCC",
                }}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Geography */}
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "#999999" }}>
          Primary Geography
        </label>
        <div className="flex flex-wrap gap-2">
          {GEOGRAPHIES.map((geo) => {
            const selected = geographies.includes(geo);
            return (
              <button
                key={geo}
                type="button"
                onClick={() => toggleGeo(geo)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-[border-color,background-color,color] duration-100"
                style={{
                  backgroundColor: selected ? "#A8FF3E" : "#111111",
                  color: selected ? "#0A0A0A" : "#CCCCCC",
                  border: selected ? "1px solid #A8FF3E" : "1px solid #1E1E1E",
                }}
              >
                {geo}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
