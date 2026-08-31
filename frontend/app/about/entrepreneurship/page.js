import AboutDetailPage from "../../../components/about/AboutDetailPage";

export const metadata = { title: "Entrepreneurship | Tangerine" };

export default function AboutEntrepreneurshipPage() {
  return (
    <AboutDetailPage
      eyebrow="About"
      title="Entrepreneurship"
      description="How Tangerine connects creativity with business thinking and helps students imagine what comes next."
      sections={[
        {
          title: "Fashion meets entrepreneurship",
          paragraphs: [
            "The fashion industry is powered by creativity, but successful fashion businesses also require entrepreneurial thinking.",
            "Tangerine encourages students to understand both, and to see that a creative idea can become a collection, a brand, and then a business.",
          ],
        },
        {
          title: "From student to fashion entrepreneur",
          paragraphs: [
            "A student may begin with design fundamentals, then learn about fabrics, silhouettes, consumer preferences, branding, and product development.",
            "Tangerine asks the bigger questions too: who is the customer, what makes a product relevant, how should a collection be presented, and how do creativity and business work together?",
          ],
        },
        {
          title: "A platform for possibility",
          paragraphs: [
            "Tangerine shows that education becomes more powerful when students can see their knowledge working in the real world.",
            "It is a platform for students to imagine themselves as designers, creative directors, merchandisers, boutique managers, brand managers, founders, and future entrepreneurs.",
          ],
        },
      ]}
      links={[
        { href: "/about/learning", label: "Previous: Learning & Collaboration" },
        { href: "/about/locations", label: "Next: Locations & Vision" },
      ]}
    />
  );
}
