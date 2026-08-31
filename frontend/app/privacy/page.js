import PolicyPage from "../../components/policy/PolicyPage";

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="This page explains how we collect, use, and protect your personal information."
      effectiveDate="August 31, 2026"
      sections={[
        {
          title: "Information We Collect",
          paragraphs: [
            "We may collect your name, email address, phone number, shipping address, order history, and account details when you interact with our store.",
            "We may also collect technical information such as browser type, device information, and usage data to improve site performance.",
          ],
        },
        {
          title: "How We Use Information",
          paragraphs: [
            "We use your information to process orders, provide customer support, improve the website, and send important updates about your purchases.",
          ],
        },
        {
          title: "Sharing Information",
          paragraphs: [
            "We do not sell your personal information. We may share limited data with service providers who help us operate the store, such as payment or delivery partners.",
          ],
        },
        {
          title: "Your Choices",
          paragraphs: [
            "You may request access, correction, or deletion of certain information where applicable by contacting our support team.",
          ],
        },
      ]}
    />
  );
}
