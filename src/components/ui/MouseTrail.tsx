"use client";

import { useEffect, useRef, useState } from "react";

const PARTICLE_COLORS = [
    "217, 119, 87",
    "106, 155, 204",
    "120, 140, 93",
];

class TrailParticle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    life: number;
    maxLife: number;
    color: string;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.maxLife = 60;
        this.life = this.maxLife;
        this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        this.size = Math.max(0, this.size - 0.05);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        const opacity = (this.life / this.maxLife) * 0.5;
        ctx.fillStyle = `rgba(${this.color}, ${opacity})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export default function MouseTrail() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isTouchDevice] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    });

    useEffect(() => {
        if (isTouchDevice) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const particles: TrailParticle[] = [];
        const maxParticles = 50;
        let animationFrame = 0;

        // Mouse state
        const mouse = { x: width / 2, y: height / 2 };

        // Handle resize
        const onResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        // Handle mouse move
        const onMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;

            // Add particles on move
            for (let i = 0; i < 3; i++) {
                particles.push(new TrailParticle(mouse.x, mouse.y));
            }
        };

        window.addEventListener("resize", onResize);
        window.addEventListener("mousemove", onMouseMove);

        // Initialize size
        onResize();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw(ctx);

                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                }
            }

            // Limit number of particles
            if (particles.length > maxParticles) {
                particles.splice(0, particles.length - maxParticles);
            }

            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("mousemove", onMouseMove);
            cancelAnimationFrame(animationFrame);
        };
    }, [isTouchDevice]);

    if (isTouchDevice) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply"
        />
    );
}
