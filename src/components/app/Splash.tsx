import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function Splash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const name = useStore((s) => s.settings?.storeName) || "Rj Store";

  useEffect(() => {
    if (sessionStorage.getItem("rj-splash")) return;
    sessionStorage.setItem("rj-splash", "1");
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(() => setShow(false), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show) return null;
  const skip = () => { setLeaving(true); setTimeout(() => setShow(false), 600); };

  return (
    <div onClick={skip} className={`splash ${leaving ? "splash-out" : ""}`} role="presentation">
      <div className="splash-glow" />
      <div className="splash-grid" />
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="splash-dot" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.3}s` }} />
      ))}
      <div className="splash-stage">
        <div className="splash-ring" />
        <div className="splash-ring r2" />
        <div className="splash-cube">
          {["f", "b", "l", "r", "t", "d"].map((s) => (
            <div key={s} className={`face ${s}`}>{s === "f" || s === "b" ? "Rj" : ""}</div>
          ))}
        </div>
      </div>
      <h1 className="splash-title">{name}</h1>
      <p className="splash-sub">Products · Vendors · Stock · Bills</p>
      <div className="splash-bar"><span /></div>
    </div>
  );
}
