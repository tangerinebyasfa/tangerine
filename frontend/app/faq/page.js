import PolicyPage from "../../components/policy/PolicyPage";

export default function FaqPage() {
  return (
    <PolicyPage
      eyebrow="Help"
      title="FAQ"
      description="Quick answers to common shopping, order, and support questions."
      effectiveDate="August 31, 2026"
      sections={[
        {
          title: "ORDERS & SHOPPING",
          paragraphs: [
            "How can I place an order?",
            "Browse our collection, select your preferred size, and add the product to your cart. Proceed to checkout, enter your delivery details, and complete the payment to place your order."
          ],
        },
        {
          title: "How can I track my order?",
          paragraphs: [
            "You can check your order status from your account or follow the updates shared after your order is confirmed.",
          ],
        },
        {
          title: "What if an item is sold out?",
          paragraphs: [
            "If an item is sold out, it may appear as unavailable on the product page. You can use the notification option where enabled to get an update when it returns.",
          ],
        },
        {
          title: "How do I contact support?",
          paragraphs: [
            "Use the Contact page or the footer support links if you need help with an order, return, or shipping question.",
          ],
        },
      ]}
    />
  );
}
