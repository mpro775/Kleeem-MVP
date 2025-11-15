import { useRef, useEffect, useState, useLayoutEffect } from "react";
import "./GooeyNav.css";

type Item = { label: string; href: string };

type Props = {
  items: Item[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[]; // e.g. [1,2,3,1,2,3,1,4]
  initialActiveIndex?: number;
  // 🔧 إضافة بسيطة لاندماجها مع الـ SPA
  onSelect?: (href: string, index: number) => void;
};

const GooeyNav = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  onSelect,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLUListElement | null>(null);
  const filterRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance: number, pointIndex: number, totalPoints: number) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };
  const activateIndex = (index: number) => {
    if (!navRef.current) return;
    const liEl = navRef.current.querySelectorAll("li")[index] as HTMLLIElement | undefined;
    if (!liEl) return;
  
    setActiveIndex(index);
    updateEffectPosition(liEl);
  
    // particles (نفس منطق النقرة)
    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll(".particle");
      particles.forEach((p) => p.parentElement?.removeChild(p));
      makeParticles(filterRef.current);
    }
  
    // text re-trigger
    if (textRef.current) {
      textRef.current.classList.remove("active");
      // force reflow
      void textRef.current.offsetWidth;
      textRef.current.classList.add("active");
    }
  };
  
  // ▶️ التهيئة الأولى: فعّل المؤثرات فور التحميل على الـ initialActiveIndex
  useLayoutEffect(() => {
    activateIndex(initialActiveIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // ▶️ لو تغيّر initialActiveIndex خارجيًا (تغيير hash بدون نقرة)، نفّذ انتقالًا سلسًا
  useEffect(() => {
    if (initialActiveIndex !== activeIndex) {
      activateIndex(initialActiveIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActiveIndex]);
  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };

  const makeParticles = (element: HTMLElement) => {
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty("--time", `${bubbleTime}ms`);

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove("active");

      setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.classList.add("particle");
        particle.style.setProperty("--start-x", `${p.start[0]}px`);
        particle.style.setProperty("--start-y", `${p.start[1]}px`);
        particle.style.setProperty("--end-x", `${p.end[0]}px`);
        particle.style.setProperty("--end-y", `${p.end[1]}px`);
        particle.style.setProperty("--time", `${p.time}ms`);
        particle.style.setProperty("--scale", `${p.scale}`);
        particle.style.setProperty("--color", `var(--color-${p.color}, white)`);
        particle.style.setProperty("--rotate", `${p.rotate}deg`);

        point.classList.add("point");
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add("active");
        });
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            /* noop */
          }
        }, t as number);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    } as const;
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, index: number) => {
    const liEl = (e.currentTarget as HTMLAnchorElement).parentElement as HTMLLIElement;
    if (!liEl) return;
    // 🔧 منع التنقّل الافتراضي لو نبي نستخدم onSelect (SPA)
    if (onSelect) e.preventDefault();

    if (activeIndex === index) {
      if (onSelect) onSelect(items[index].href, index);
      return;
    }

    setActiveIndex(index);
    updateEffectPosition(liEl);

    // particles
    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll(".particle");
      particles.forEach((p) => p.parentElement?.removeChild(p));
      makeParticles(filterRef.current);
    }

    // text re-trigger
    if (textRef.current) {
      textRef.current.classList.remove("active");
      void textRef.current.offsetWidth;
      textRef.current.classList.add("active");
    }

    if (onSelect) onSelect(items[index].href, index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const liEl = (e.currentTarget as HTMLAnchorElement).parentElement as HTMLLIElement;
      if (liEl) {
        // اصنع حدثًا افتراضيًا للاندماج
        handleClick({ ...({} as React.MouseEvent<HTMLAnchorElement, MouseEvent>), currentTarget: e.currentTarget, preventDefault: () => {} } as React.MouseEvent<HTMLAnchorElement, MouseEvent>, index);
      }
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll("li")[activeIndex] as HTMLLIElement | undefined;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add("active");
    }

    const ro = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll("li")[activeIndex] as HTMLLIElement | undefined;
      if (currentActiveLi) updateEffectPosition(currentActiveLi);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <div className="gooey-nav-container" ref={containerRef} dir="rtl">
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={index} className={activeIndex === index ? "active" : ""}>
              <a href={item.href} onClick={(e) => handleClick(e, index)} onKeyDown={(e) => handleKeyDown(e, index)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  );
};

export default GooeyNav;
