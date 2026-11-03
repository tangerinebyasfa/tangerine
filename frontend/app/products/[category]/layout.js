const CATEGORY_TITLES = {
  indian: "Indian",
  casual: "Casual",
  western: "Western",
  corporate: "Corporate",
  outlet: "Outlet",
};

export function generateMetadata({ params }) {
  const categoryTitle = CATEGORY_TITLES[params.category];
  if (!categoryTitle) return {};

  return {
    title: `${categoryTitle} | Tangerine`,
    ...(params.category === "outlet" && {
      description: "Tangerine brings a refined perspective to everyday dressing, defined by clean silhouettes, considered details, and an understated warmth that feels distinctly its own.",
    }),
  };
}

export default function CategoryLayout({ children }) {
  return children;
}
