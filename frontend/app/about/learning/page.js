import AboutDetailPage from "../../../components/about/AboutDetailPage";

export const metadata = { title: "Learning & Collaboration | Tangerine" };

export default function AboutLearningPage() {
  return (
    <AboutDetailPage
      eyebrow="About"
      title="Learning & Collaboration"
      description="How the boutique becomes a living learning environment for students, faculty, and professionals."
      sections={[
        {
          title: "Where student creativity meets professional expertise",
          paragraphs: [
            "The brand creates a space where students, faculty, and professionals can contribute their perspectives and expertise.",
            "Students bring curiosity and experimentation, while faculty and professionals bring guidance, industry understanding, and professional standards.",
          ],
        },
        {
          title: "Learning beyond the classroom",
          paragraphs: [
            "Tangerine helps bridge fashion education and professional practice by showing how collections are displayed, how products are paired, and how a boutique communicates its identity.",
            "Students can observe how creative decisions connect with commercial realities and begin thinking as future designers, managers, and brand builders.",
          ],
        },
        {
          title: "Boutique management as a learning environment",
          paragraphs: [
            "Behind the scenes, boutique management includes planning, presentation, customer understanding, product management, pricing, branding, and retail experience.",
            "Tangerine turns these ideas into something students can see and learn from in a real setting.",
          ],
        },
      ]}
      links={[
        { href: "/about/story", label: "Previous: Our Story" },
        { href: "/about/entrepreneurship", label: "Next: Entrepreneurship" },
      ]}
    />
  );
}
