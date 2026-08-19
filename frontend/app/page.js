import Image from "next/image";

const homeImages = [
  {
    desktop: "/Images/HomePage/1.png",
    mobile: "/Images/HomePage/1mobile.png",
    alt: "Homepage image 1",
  },
  {
    desktop: "/Images/HomePage/2.png",
    mobile: "/Images/HomePage/2mobile.png",
    alt: "Homepage image 2",
  },
  {
    desktop: "/Images/HomePage/3.png",
    mobile: "/Images/HomePage/3mobile.png",
    alt: "Homepage image 3",
  },
];

function HomepageImage({ desktop, mobile, alt, priority = false }) {
  return (
    <div className="w-full">
      <div className="hidden md:block">
        <Image
          src={desktop}
          alt={alt}
          width={1920}
          height={1080}
          className="block h-auto w-full object-cover"
          priority={priority}
        />
      </div>
      <div className="block md:hidden">
        <Image
          src={mobile}
          alt={alt}
          width={1200}
          height={1600}
          className="block h-auto w-full object-cover"
          priority={priority}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="w-full">
      <div className="flex flex-col">
        {homeImages.map((image, index) => (
          <HomepageImage
            key={image.desktop}
            desktop={image.desktop}
            mobile={image.mobile}
            alt={image.alt}
            priority={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
