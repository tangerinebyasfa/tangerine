import PolicyPage from "../../components/policy/PolicyPage";

export default function ReturnsPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Help"
      title="Returns Policy"
      description="This page explains when returns are accepted and how to request one."
      effectiveDate="August 31, 2026"
      sections={[
        {
          title: "Return Eligibility",
          paragraphs: [
            "Submit a standard return or exchange request within 7 days of delivery. Items must be unused, with their original tags and packaging, and remain subject to store review.",
            "Items that are damaged through normal wear, altered, washed, or missing tags may not be eligible.",
          ],
        },
        {
          title: "How to Request a Return",
          paragraphs: [
            "Sign in, open your order from your profile, and use Returns & exchanges to select a purchased item and describe the reason. Each request covers all units in that purchased line.",
            "Follow your request status and the store's instructions on the order page. Wait for approval before sending anything back. Contact support if you cannot submit a request online.",
          ],
        },
        {
          title: "Refunds and Exchanges",
          paragraphs: [
            "Approved refunds cover the original item price after its share of any order discount; the original shipping charge is excluded from standard item refunds. Refunds are confirmed by the store after receipt and inspection.",
            "Exchanges are for a different size or colour of the same product, subject to stock and approval. Courier and tracking details appear on your request when the replacement is shipped.",
          ],
        },
        {
          title: "Non-Returnable Items",
          paragraphs: [
            "Certain sale items, hygiene-sensitive products, or final sale items may not be eligible for return unless required by law.",
          ],
        },
      ]}
    />
  );
}
