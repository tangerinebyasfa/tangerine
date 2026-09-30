import PolicyPage from "../../components/policy/PolicyPage";

export default function TermsAndConditionsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms & Conditions"
      description="Welcome to Tangerine. These Terms & Conditions govern your access to and use of the Tangerine website, including browsing, purchasing products, creating an account, and interacting with our services. By accessing or using our website, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these Terms, please discontinue use of the website."
      // effectiveDate="August 31, 2026"
      sectionTitleClassName="text-tangerine"
      sections={[
        {
          title: "Use of Our Website",
          paragraphs: [
            "You agree to use the Tangerine website only for lawful purposes and in accordance with these Terms.",
            "You must not: use the website for fraudulent or unlawful activities; attempt to gain unauthorized access to our website or systems; interfere with the security or functioning of the website; copy, reproduce or commercially exploit our content without permission; upload or transmit viruses, malicious code or harmful material; or use the website in a manner that may harm Tangerine or other users.",
            "We reserve the right to restrict or terminate access to the website where necessary."
          ],
        },
        {
          title: "Products & Product Information",
          paragraphs: [
            "We make every reasonable effort to ensure that product descriptions, photographs, colours, measurements, prices and other information displayed on our website are accurate.",
            "However, slight variations may occur, particularly in colour, texture, print placement, finish and measurements. Colours may also appear different depending on your screen and device settings.",
            "For handcrafted, artisanal or individually produced products, minor variations may be an inherent characteristic of the product and are not necessarily considered defects."
          ],
        },
        {
          title: "Product Availability",
          paragraphs: [
            "All products are subject to availability.",
            "Adding a product to your cart does not guarantee its availability until the order has been successfully placed and confirmed.",
            "Tangerine reserves the right to discontinue products, limit quantities or modify product information at any time.",
            "If a product becomes unavailable after you have placed an order, we will notify you and provide an appropriate resolution, including a refund where applicable."
          ],
        },
        {
          title: "Pricing & Taxes",
          paragraphs: [
            "All prices displayed on our website are in Indian Rupees (INR) unless otherwise stated.",
            "Applicable taxes, shipping charges and other charges will be displayed at checkout where applicable.",
            "Tangerine reserves the right to change prices at any time. Changes in price will not affect orders that have already been successfully accepted, except where an obvious pricing or technical error has occurred."
          ],
        },
        {
          title: "Orders",
          paragraphs: [
            "When placing an order, you confirm that all information provided by you is accurate and complete.",
            "Once your order is placed, you may receive an order confirmation by email, SMS, WhatsApp or another communication method provided by you.",
            "An order confirmation confirms that we have received your order. An order may still be cancelled where circumstances such as product unavailability, payment issues, pricing errors or suspected fraudulent activity arise.",
            "If an order is cancelled after payment has been received, any eligible refund will be processed through the applicable payment method."
          ],
        },
        {
          title: "Payments",
          paragraphs: [
            "Tangerine accepts the payment methods displayed at checkout, which may include cards, UPI, net banking, wallets and other available payment options.",
            "Payments may be processed through third-party payment providers. Your payment information may therefore be subject to the terms and privacy policies of those providers.",
            "You confirm that you are authorised to use the payment method used for your purchase."
          ],
        },
        {
          title: "Shipping & Delivery",
          paragraphs: [
            "Orders will be delivered to the address provided during checkout.",
            "Delivery timelines displayed on the website are estimated timelines and are not guaranteed, as delivery may be affected by location, courier operations, weather, public holidays, logistical disruptions or circumstances beyond our reasonable control.",
            "Customers are responsible for providing an accurate delivery address and contact information.",
            "Once an order has been handed over to the courier, delivery is also subject to the courier's operational conditions."
          ],
        },
        {
          title: "Cancellation",
          paragraphs: [
            "Cancellation requests may be accepted only before an order has been processed or dispatched.",
            "Once an order has been dispatched, cancellation may no longer be possible.",
            "Where a cancellation is accepted, any applicable refund will be processed according to our Cancellation & Refund Policy and applicable law."
          ],
        },
        {
          title: "Damaged, Defective or Incorrect Products",
          paragraphs: [
            "If you receive a damaged, defective or incorrect product, please contact us at [email address] within [X] days of delivery.",
            "To help us resolve the issue, we may request photographs, videos, packaging details, order information or other relevant documentation.",
            "After verification, Tangerine may provide an appropriate remedy, including replacement, exchange, repair or refund, as applicable."
          ],
        },
        {
          title: "Promotions & Discount Codes",
          paragraphs: [
            "Promotional offers and discount codes may be subject to additional terms and validity periods.",
            "Unless otherwise stated: discount codes cannot be exchanged for cash; promotional offers cannot be combined unless specifically permitted; certain products may be excluded from promotions; and offers are valid only for the period specified.",
            "Tangerine reserves the right to correct errors or withdraw a promotional offer where necessary, subject to applicable law."
          ],
        },
        {
          title: "Intellectual Property",
          paragraphs: [
            "All content appearing on the Tangerine website, including our name and logo, product photographs, fashion imagery, illustrations, graphics, videos, text, product descriptions, website design and layout is owned by, licensed to, or otherwise lawfully used by Tangerine.",
            "No content may be copied, reproduced, modified, distributed, published or commercially exploited without our prior written permission."
          ],
        },
        {
          title: "Customer Reviews & Content",
          paragraphs: [
            "If you submit a review, photograph, feedback or other content to Tangerine, you confirm that you have the necessary rights to provide that content and that it does not violate any law or third-party rights.",
            "By submitting such content, you grant Tangerine permission to use, reproduce and display it for legitimate business and promotional purposes, subject to applicable law.",
            "We may remove content that is unlawful, misleading, abusive or otherwise inappropriate."
          ],
        },
        {
          title: "Third-Party Services",
          paragraphs: [
            "Our website may use third-party services including payment gateways, delivery partners, analytics providers and other technology services.",
            "These services may operate under their own terms and privacy policies.",
            "Tangerine is not responsible for the independent practices, content or policies of third-party websites and services."
          ],
        },
        {
          title: "Privacy",
          paragraphs: [
            "Your use of the Tangerine website is also governed by our Privacy Policy.",
            "Our Privacy Policy explains how we collect, use, store and protect information provided by you.",
            "Privacy Policy: [Insert Privacy Policy URL]"
          ],
        },
        {
          title: "Website Availability",
          paragraphs: [
            "We make reasonable efforts to keep our website available and functioning properly. However, we do not guarantee that the website will always be uninterrupted, error-free or completely secure.",
            "We may temporarily suspend or modify the website for maintenance, updates, security or operational reasons."
          ],
        },
      ]}
    />
  );
}
