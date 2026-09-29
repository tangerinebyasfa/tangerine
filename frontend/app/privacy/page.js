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
            "When you interact with Tangerine, we may collect information such as your name, email address, phone number, shipping and billing details, account information, and order history.",
            "We may also collect limited technical information, including your device type, browser, IP address, and website activity. This helps us understand how our website is used and allows us to continually improve your experience.",
          ],
        },
        {
          title: "How We Use Information",
          paragraphs: [
            "Your information allows us to provide a seamless experience from browsing to delivery. We may use it to:",
          ],
          items: [
            "Process and fulfil your orders",
            "Arrange shipping, returns, and exchanges",
            "Respond to enquiries and provide customer support",
            "Maintain and improve our website and services",
            "Send important order and account updates",
            "Share collection updates or offers where you have chosen to receive them",
            "Protect our website and customers from fraud or misuse"
          ],
        },
        {
          title: "Sharing Information",
          paragraphs: [
            "Your privacy matters to us. Tangerine does not sell or rent your personal information.",
            "We may share necessary information with trusted partners who help us operate our business, such as payment processors, delivery partners, technology providers, and customer-support services. These partners receive only the information required to perform their services.",
            "We may also disclose information when required by law or when necessary to protect our customers, business, or legal rights."
          ],
        },
        {
          title: "Cookies",
          paragraphs: [
            "Our website may use cookies and similar technologies to remember your preferences, keep your shopping experience seamless, understand website usage, and improve our services.",
            "You can manage cookie preferences through your browser settings. Some website features may not function as intended if certain cookies are disabled."
          ],
        },
         {
          title: "Your Privacy Choices",
          paragraphs: [
            "You may contact us to request access to, correction of, or deletion of certain personal information, where applicable.",
            "You may also choose to unsubscribe from promotional communications at any time. Transactional communications, such as order confirmations and delivery updates, may still be sent when necessary."
          ],
        },
          {
          title: "Data Security",
          paragraphs: [
            "We take reasonable measures to safeguard the information entrusted to us. While we work to protect your personal information, no method of online transmission or storage can be guaranteed to be completely secure.",
          ],
        },
      ]}
    />
  );
}
