"use client";

import { useEffect, useRef } from "react";

interface LegacyHtmlRendererProps {
  html: string;
  styles?: string;
}

export default function LegacyHtmlRenderer({ html, styles }: LegacyHtmlRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeScriptsRef = useRef<HTMLScriptElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up any previously added scripts
    activeScriptsRef.current.forEach((script) => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    activeScriptsRef.current = [];

    // Find all script tags in the rendered HTML
    const scripts = container.querySelectorAll("script");
    scripts.forEach((originalScript) => {
      const newScript = document.createElement("script");

      // Copy all attributes
      Array.from(originalScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Copy script content
      newScript.textContent = originalScript.textContent;

      // Append to body to execute globally
      document.body.appendChild(newScript);
      activeScriptsRef.current.push(newScript);
    });

    return () => {
      // Cleanup on unmount
      activeScriptsRef.current.forEach((script) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
      activeScriptsRef.current = [];
    };
  }, [html]);

  return (
    <div className="relative w-full">
      {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
