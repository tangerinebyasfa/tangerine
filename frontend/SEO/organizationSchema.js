import { toAbsoluteUrl } from "./schemaUtils";

export function createOrganizationSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tangerine Fashion World",
    alternateName: ["Tangerine", "Tangerine Clothing", "Tangerine AUM"],
    description: "Tangerine brings a refined perspective to everyday dressing, defined by clean silhouettes, considered details, and an understated warmth that feels distinctly its own.",
    url: origin,
    logo: toAbsoluteUrl("/Images/logo.png", origin),
  };
}
