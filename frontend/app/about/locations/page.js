import AboutDetailPage from "../../../components/about/AboutDetailPage";

export const metadata = { title: "Locations & Vision | Tangerine" };

export default function AboutLocationsPage() {
  return (
    <AboutDetailPage
      eyebrow="About"
      title="Locations & Vision"
      description="Tangerine's two locations and the broader vision behind the brand experience."
      sections={[
        {
          title: "Atharva University, Mumbai",
          paragraphs: [
            "Our presence at Atharva University places Tangerine in an active educational and creative environment.",
            "It creates a natural connection between academic knowledge and real-world boutique practice in one of India's most dynamic fashion cities.",
          ],
        },
        {
          title: "Blue Ocean Resort, Ratnagiri",
          paragraphs: [
            "Tangerine also has a presence at Blue Ocean Resort in Ratnagiri, extending the brand experience into a lifestyle and travel setting.",
            "Together, the Mumbai and Ratnagiri locations represent the meeting point of education, creativity, retail, travel, and discovery.",
          ],
        },
        {
          title: "Our vision and philosophy",
          paragraphs: [
            "The vision is to keep Tangerine growing as a distinctive fashion and lifestyle brand while continuing to connect fashion education, professional practice, boutique management, and entrepreneurship.",
            "At Tangerine, we believe in learning by creating, learning by experiencing, and helping students turn ideas into opportunities.",
          ],
        },
      ]}
      links={[
        { href: "/about/story", label: "Back to Story" },
        { href: "/about", label: "Back to About Hub" },
      ]}
    />
  );
}
