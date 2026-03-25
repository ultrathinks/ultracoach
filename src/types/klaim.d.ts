import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "klaim-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "pricing-table-id"?: string;
          "success-url"?: string;
          "cancel-url"?: string;
          "user-email"?: string;
          "user-name"?: string;
        },
        HTMLElement
      >;
    }
  }
}
