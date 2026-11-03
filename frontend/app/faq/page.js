import PolicyPage from "../../components/policy/PolicyPage";

export default function FaqPage() {
  return (
    <PolicyPage
      eyebrow="Help"
      title="FAQ"
      description="Quick answers to common shopping, order, and support questions."
      sectionTitleClassName="text-tangerine"
      // effectiveDate="August 31, 2026"
      sections={[
        {
          title: "ORDERS & SHOPPING",
          paragraphs: [
            "How can I place an order?" ,
            "Browse our collection, select your preferred size, and add the product to your cart. Proceed to checkout, enter your delivery details, and place your cash-on-delivery order.",
            "Do I need an account to place an order?",
            "No. You can shop using guest checkout. Creating an account simply makes it easier to manage your orders and personal details.",
            "Can I cancel or modify my order?",
            "Orders can be cancelled or modified only before they are processed for dispatch. Please contact us as soon as possible if you need to make a change.",
            "What if an item is out of stock?",
            "If a product is unavailable, you can use the Notify Me option, where available, to receive an update when it is restocked."

          ],
        },
        {
          title: "SIZE & FIT",
          paragraphs: [
            "How do I choose the right size?",
            "Please refer to our Size Guide before placing your order. Product pages may also include fit and measurement details to help you select the right size.",
            "What if I am between two sizes?",
            "We recommend comparing your measurements with our Size Guide and checking the fit description on the product page. If you are still unsure, our support team will be happy to assist.",
            "Are the garments true to size?",
            "Fit can vary depending on the silhouette and design. Please refer to the individual product description and Size Guide for the most accurate information."
          ],
        },
        {
          title: "SHIPPING & DELIVERY",
          paragraphs: [
            "Where do you deliver?",
            "We currently deliver to serviceable locations across India.",
            "How long will my order take to arrive?",
            "Orders are processed and dispatched within the timeframe mentioned at checkout. Delivery time may vary depending on your location and courier service.",
            "How can I track my order?",
            "Once your order has been dispatched, tracking details will be shared through the contact information provided at checkout. You may also track your order through your account, where applicable.",
            "Can I change my delivery address after placing an order?",
            "Address changes may be possible before dispatch. Please contact us immediately if you need to update your delivery address.",
            "What should I do if my order is delayed?",
            "If your order has exceeded the expected delivery timeline, please contact our support team with your order number and we will assist you with the shipment status."
          ],
        },
        {
          title: "PAYMENTS",
          paragraphs: [
            "What payment methods do you accept?",
            "We currently accept Cash on Delivery. Pay the confirmed order total in cash when your order arrives.",
            "Do I need to share card or banking details?",
            "No. Cash on Delivery does not require you to share card, UPI, or banking details during checkout.",
            "When is my order confirmed?",
            "Your order is confirmed as soon as it is placed successfully. No online payment is required before delivery."
          ],
        },
         {
          title: "PRODUCTS & CARE",
          paragraphs: [
            "Where can I find fabric and product details?",
            "Fabric composition, fit, construction and other relevant details are provided on the respective product page wherever applicable.",
            "How should I care for my Tangerine garment?",
            "Please follow the care instructions provided with your garment. Proper washing, drying and storage will help maintain its quality and longevity.",
            "Will the colour look exactly like it does on my screen?",
            "We make every effort to represent colours accurately. However, slight variations may occur depending on your device and screen settings."
          ],
        },
        {
          title: "CUSTOMER SUPPORT",
          paragraphs: [
            "How can I contact Tangerine?",
            "You can reach us through our Contact Us page or the support details provided on our website. For order-related queries, please keep your order number handy.",
            "How long does customer support take to respond?",
            "Our team responds during our stated support hours. Response times may vary depending on the nature and volume of enquiries.",
          ],
        },
      ]}
    />
  );
}
