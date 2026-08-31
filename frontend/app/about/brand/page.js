import AboutDetailPage from "../../../components/about/AboutDetailPage";

export const metadata = { title: "Brand & Style | Tangerine" };

export default function AboutBrandPage() {
  return (
    <AboutDetailPage
      eyebrow="About"
      title="Brand & Style"
      description="Tangerine as a women's fashion and lifestyle brand, with clothing, footwear, and accessories at the core."
      sections={[
        {
          title: "A professional women's fashion brand",
          paragraphs: [
            "While learning and education are part of the story, Tangerine is fundamentally a professional women's fashion and lifestyle brand.",
            "The collection is designed for women who want expressive, elegant, and contemporary fashion with a strong identity.",
          ],
        },
        {
          title: "What the collection includes",
          items: [
            "Women's clothing designed for comfort, elegance, and individuality.",
            "Footwear selected to complete modern wardrobes.",
            "Bangles that add detail, color, and character.",
            "Necklaces that enhance different fashion styles.",
            "Earrings that range from subtle to expressive.",
            "Fashion accessories that help personalize every look.",
          ],
        },
        {
          title: "Fashion for every woman",
          paragraphs: [
            "Tangerine is made for students discovering personal style, young women exploring contemporary fashion, working professionals building versatile wardrobes, and women looking for distinctive pieces.",
            "The goal is not to force one fashion identity, but to offer pieces that feel personal and expressive.",
          ],
        },
      ]}
      links={[
        { href: "/about/learning", label: "Learning & Collaboration" },
        { href: "/about/locations", label: "Locations & Vision" },
      ]}
    />
  );
}
