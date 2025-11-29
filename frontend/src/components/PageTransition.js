"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);
  const [currentChildren, setCurrentChildren] = useState(children);
  const [prevChildren, setPrevChildren] = useState(null);
  const [stage, setStage] = useState("entered"); // 'leaving' | 'entering' | 'entered'

  useEffect(() => {
    // initial mount
    setCurrentPath(pathname);
    setCurrentChildren(children);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === currentPath) {
      // same route (but children might have changed) -> update content without animation
      setCurrentChildren(children);
      return;
    }

    // Start leaving animation for previous content
    setPrevChildren(currentChildren);
    setStage("leaving");

    const leaveDur = 200;
    const enterDur = 320;

    const leaveTimer = setTimeout(() => {
      // swap in new content
      setCurrentPath(pathname);
      setCurrentChildren(children);
      setPrevChildren(null);
      setStage("entering");

      const enterTimer = setTimeout(() => {
        setStage("entered");
      }, enterDur);

      return () => clearTimeout(enterTimer);
    }, leaveDur);

    return () => clearTimeout(leaveTimer);
    // we intentionally only depend on pathname and children
  }, [pathname, children, currentPath, currentChildren]);

  return (
    <div className="page-transition-root" style={{ position: "relative" }}>
      {prevChildren ? (
        <div
          className={`page-wrap page-leave`}
          style={{ position: "absolute", inset: 0 }}
        >
          {prevChildren}
        </div>
      ) : null}

      <div
        className={`page-wrap ${
          stage === "entering" ? "page-enter" : "page-enter-done"
        }`}
      >
        {currentChildren}
      </div>
    </div>
  );
}
