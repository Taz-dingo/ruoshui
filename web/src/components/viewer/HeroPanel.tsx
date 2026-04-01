interface HeroPanelProps {
  subtitle: string;
  title: string;
}

function HeroPanel({
  subtitle,
  title
}: HeroPanelProps) {
  return (
    <div className="hero">
      <h1>{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
    </div>
  );
}

export {
  HeroPanel
};
