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
      success-url="https://example.com/payment-success"
      cancel-url="https://example.com/payment-cancel"
      user-email="example@example.com"
      user-name="John Doe"
    />
  );
}
