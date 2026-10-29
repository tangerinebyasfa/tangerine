export function generateMetadata({ params }) {
  if (params.category !== "outlet") return {};

  return {
    title: "Outlet | Tangerine",
    description: "Tangerine brings a refined perspective to everyday dressing, defined by clean silhouettes, considered details, and an understated warmth that feels distinctly its own.",
  };
}

export default function CategoryLayout({ children }) {
  return children;
}
