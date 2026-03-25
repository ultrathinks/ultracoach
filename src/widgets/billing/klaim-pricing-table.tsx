"use client";

import { useEffect } from "react";

export function KlaimPricingTable() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://embed.klaim.me/v3.bundle.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <klaim-pricing-table
      pricing-table-id="briefly/Fcz3O8te8el391dBsOKn"
      success-url="https://coach.jmo.kr/dashboard"
      cancel-url="https://coach.jmo.kr/dashboard"
      user-email="leegeh1213@gmail.com"
      user-name="John Doe"
    />
  );
}
