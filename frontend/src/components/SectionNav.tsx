import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

/**
 * Minimal floating section navigation (dots). Replaces the traditional
 * sidebar/topbar: it tracks the section in view and smooth-scrolls on click.
 * Hidden on small screens where it would compete with content.
 */
export function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="section-nav" aria-label="Section navigation">
      {sections.map((s) => (
        <button
          key={s.id}
          className={"section-dot" + (active === s.id ? " active" : "")}
          onClick={() => go(s.id)}
          aria-label={s.label}
          aria-current={active === s.id}
        >
          <span className="section-dot-mark" />
          <span className="section-dot-label">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}
