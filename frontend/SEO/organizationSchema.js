import { toAbsoluteUrl } from "./schemaUtils";

export function createOrganizationSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tangerine",
    url: origin,
    logo: toAbsoluteUrl("/Images/logo.png", origin),
  };
}
