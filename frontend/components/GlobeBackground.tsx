"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GlobeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 5.5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();

    // 1. Inner solid core to hide the back half of the globe (creates depth)
    const innerGeometry = new THREE.SphereGeometry(1.95, 32, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x050814, // Very dark blue/black
      transparent: true,
      opacity: 0.8,
    });
    globeGroup.add(new THREE.Mesh(innerGeometry, innerMaterial));

    // 2. High-detail geometry for points and lines (Icosahedron creates even distribution unlike Sphere)
    const outerGeometry = new THREE.IcosahedronGeometry(2, 4);

    // 3. Glowing dots (nodes of the AI network)
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x60a5fa, // Bright blue
      size: 0.035,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    globeGroup.add(new THREE.Points(outerGeometry, pointsMaterial));

    // 4. Subtle connecting lines (neural network edges)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8, // Indigo/purple glow
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    globeGroup.add(new THREE.Mesh(outerGeometry, wireframeMaterial));

    scene.add(globeGroup);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Continuous independent rotation
      globeGroup.rotation.y += 0.003; // Increased speed slightly
      globeGroup.rotation.x += 0.001;

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize robustly
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      innerGeometry.dispose();
      innerMaterial.dispose();
      outerGeometry.dispose();
      pointsMaterial.dispose();
      wireframeMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
}
