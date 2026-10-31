"use client";
import { useEffect, useState } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { tsParticles } from "@tsparticles/engine";
import type { Container } from "@tsparticles/engine";

export default function NetworkBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    loadSlim(tsParticles).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    console.log(container);
  };

  if (!init) {
    return <div className="absolute inset-0 bg-[#0B192C] z-[-1]" />;
  }

  return (
    <Particles
      id="tsparticles"
      particlesLoaded={particlesLoaded}
      className="absolute inset-0 z-[-1]"
      options={{
        background: {
          color: {
            value: "#0B192C", // Dark blueish background
          },
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: true,
              mode: "push",
            },
            onHover: {
              enable: true,
              mode: "grab", // Grabs nodes to cursor, feeling more 'connected'
            },
          },
          modes: {
            push: {
              quantity: 3,
            },
            grab: {
              distance: 150,
              links: {
                opacity: 0.7,
                color: "#8b5cf6" // Purple links when hovering
              }
            },
          },
        },
        particles: {
          color: {
            value: ["#3b82f6", "#8b5cf6", "#e2e8f0"], // Blue, Purple, Light Gray
          },
          links: {
            color: "#60a5fa",
            distance: 140,
            enable: true,
            opacity: 0.3,
            width: 1.2,
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce",
            },
            random: true,
            speed: 0.6, // Slow organic movement
            straight: false,
          },
          number: {
            density: {
              enable: true,
            },
            value: 120, // Denser network
          },
          opacity: {
            value: { min: 0.2, max: 0.7 },
            animation: {
              enable: true,
              speed: 1,
              sync: false,
            }
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 4 },
            animation: {
              enable: true,
              speed: 2,
              sync: false
            }
          },
        },
        detectRetina: true,
      }}
    />
  );
}
