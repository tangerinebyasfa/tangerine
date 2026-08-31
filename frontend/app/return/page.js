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
            "Returns are generally accepted for unused items in their original condition and packaging within the return window shown on the product or order confirmation.",
            "Items that are damaged through normal wear, altered, washed, or missing tags may not be eligible.",
          ],
        },
        {
          title: "How to Request a Return",
          paragraphs: [
            "Contact our support team with your order details and the reason for the return.",
            "Once your request is reviewed, we will share the next steps if the item qualifies.",
          ],
        },
        {
          title: "Refunds and Exchanges",
          paragraphs: [
            "Approved returns may be processed as a refund, replacement, or exchange depending on product availability and the reason for return.",
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
