"use client";

import { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    size: number;
    density: number;
}

export default function ParticleField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -100, y: -100 });
    const particlesRef = useRef<Particle[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const particlesArray = [];
            // 增加粒子密度，每 8000 像素区域一个粒子 (原 9000)
            const numberOfParticles = (canvas.width * canvas.height) / 8000;

            for (let i = 0; i < numberOfParticles; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                // 增大粒子尺寸: 1.5 ~ 4
                const size = Math.random() * 2.5 + 1.5;
                const density = Math.random() * 30 + 1;

                particlesArray.push({
                    x,
                    y,
                    baseX: x,
                    baseY: y,
                    size,
                    density
                });
            }
            particlesRef.current = particlesArray;
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const mouse = mouseRef.current;

            for (let i = 0; i < particlesRef.current.length; i++) {
                const p = particlesRef.current[i];

                const dx = mouse.x - p.baseX;
                const dy = mouse.y - p.baseY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 300; // 增大影响范围 (原 250)

                if (distance < maxDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (maxDistance - distance) / maxDistance;

                    const directionX = forceDirectionX * force * p.density;
                    const directionY = forceDirectionY * force * p.density;

                    // 减小拉扯幅度 (原 2.5 -> 1.5)
                    p.x = p.baseX + directionX * 1.5;
                    p.y = p.baseY + directionY * 1.5;
                } else {
                    if (p.x !== p.baseX) {
                        const dx = p.x - p.baseX;
                        p.x -= dx / 10;
                    }
                    if (p.y !== p.baseY) {
                        const dy = p.y - p.baseY;
                        p.y -= dy / 10;
                    }
                }

                // 绘制粒子 - 提高不透明度到 0.6
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(168, 85, 247, 0.6)";
                ctx.fill();

                // 绘制连线
                for (let j = i + 1; j < particlesRef.current.length; j++) {
                    const p2 = particlesRef.current[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // 增加连线距离到 120
                    if (distance < 120) {
                        ctx.beginPath();
                        const opacity = 1 - distance / 120;
                        // 显著提高连线可见度 (opacity * 0.5)
                        ctx.strokeStyle = `rgba(168, 85, 247, ${opacity * 0.5})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }

                // 绘制粒子与鼠标的连线
                const distMouse = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2);
                if (distMouse < 200) { // 增大连接范围到 200
                    ctx.beginPath();
                    const opacity = 1 - distMouse / 200;
                    // 提高鼠标连线亮度 (opacity * 0.8)
                    ctx.strokeStyle = `rgba(236, 72, 153, ${opacity * 0.8})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }

            animationId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            init();
        };

        const handleMouseMove = (event: MouseEvent) => {
            mouseRef.current = {
                x: event.x,
                y: event.y
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -100, y: -100 };
        }

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseout", handleMouseLeave);

        init();
        animate();

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseout", handleMouseLeave);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none -z-10"
        />
    );
}
