import PolicyPage from "../../components/policy/PolicyPage";

export default function TermsAndConditionsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms & Conditions"
      description="These terms explain how you can use the website, place orders, and interact with Tangerine."
      effectiveDate="August 31, 2026"
      sections={[
        {
          title: "Use of the Website",
          paragraphs: [
            "By using this website, you agree to follow these terms and all applicable laws and regulations.",
            "You must not use the site in a way that could harm the platform, interfere with other users, or attempt unauthorized access.",
          ],
        },
        {
          title: "Orders and Payments",
          paragraphs: [
            "When you place an order, you confirm that the information you provide is accurate and complete.",
            "We may cancel or refuse any order if pricing, inventory, or verification issues arise.",
          ],
        },
        {
          title: "Product Information",
          paragraphs: [
            "We make every effort to display product details, images, and prices accurately, but minor differences may occur.",
            "Stock availability can change at any time without notice.",
          ],
        },
        {
          title: "Changes to These Terms",
          paragraphs: [
            "We may update these terms from time to time. Continued use of the site means you accept the updated version.",
          ],
        },
      ]}
    />
  );
}
