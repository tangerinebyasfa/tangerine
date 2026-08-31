import AboutDetailPage from "../../../components/about/AboutDetailPage";

export const metadata = { title: "Our Story | Tangerine" };

export default function AboutStoryPage() {
  return (
    <AboutDetailPage
      eyebrow="About"
      title="Our Story"
      description="The beginning of Tangerine and the idea that fashion education can become more meaningful through real boutique experience."
      sections={[
        {
          title: "Where it began",
          paragraphs: [
            "Tangerine began with the belief that fashion education becomes more powerful when students can experience the professional world while they are still learning.",
            "Founded by Sunil Rane, the brand was built as a professional boutique with a distinctive connection to Atharva University - School of Design.",
          ],
        },
        {
          title: "What Tangerine represents",
          paragraphs: [
            "More than a fashion destination, Tangerine is a journey where ideas move from classrooms and creative discussions into a real retail environment.",
            "It gives students exposure to boutique management, fashion entrepreneurship, merchandising, branding, customer preferences, and the practical workings of the fashion industry.",
          ],
        },
      ]}
      links={[
        { href: "/about/learning", label: "Next: Learning & Collaboration" },
        { href: "/about", label: "Back to About Hub" },
      ]}
    />
  );
}
