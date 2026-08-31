import PolicyPage from "../../components/policy/PolicyPage";

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Help"
      title="Shipping Policy"
      description="This page covers order dispatch, shipping timelines, and delivery basics."
      effectiveDate="August 31, 2026"
      sections={[
        {
          title: "Order Processing",
          paragraphs: [
            "Orders are typically processed after payment confirmation and stock verification.",
            "You will receive updates when your order is packed, dispatched, or out for delivery where supported.",
          ],
        },
        {
          title: "Delivery Timelines",
          paragraphs: [
            "Delivery times vary by location, courier partner, and peak seasons. Estimated timelines are shown during checkout when available.",
          ],
        },
        {
          title: "Shipping Charges",
          paragraphs: [
            "Shipping charges, if applicable, are shown before you place your order. Promotional free-shipping offers may apply from time to time.",
          ],
        },
        {
          title: "Delays and Exceptions",
          paragraphs: [
            "Weather, courier delays, incomplete addresses, or public holidays may affect delivery times.",
          ],
        },
      ]}
    />
  );
}
