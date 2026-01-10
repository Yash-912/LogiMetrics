import createGlobe from "cobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GLOBE_CONFIG = {
    width: 1200, // Increased resolution
    height: 1200,
    onRender: () => { },
    devicePixelRatio: 2,
    phi: 0,
    theta: 0.25, // Tilted slightly to show northern hemisphere more
    dark: 1,
    diffuse: 1.2,
    mapSamples: 20000, // More dots
    mapBrightness: 12, // Brighter dots
    baseColor: [0.02, 0.05, 0.1], // Very dark navy/black
    markerColor: [59 / 255, 130 / 255, 246 / 255], // Electric Blue
    glowColor: [56 / 255, 189 / 255, 248 / 255], // Cyan Glow
    markers: [
        { location: [14.5995, 120.9842], size: 0.03 },
        { location: [19.076, 72.8777], size: 0.05 },
        { location: [23.8103, 90.4125], size: 0.05 },
        { location: [30.0444, 31.2357], size: 0.07 },
        { location: [39.9042, 116.4074], size: 0.08 },
        { location: [-23.5505, -46.6333], size: 0.1 },
        { location: [19.4326, -99.1332], size: 0.1 },
        { location: [40.7128, -74.006], size: 0.1 },
        { location: [34.6937, 135.5022], size: 0.05 },
        { location: [41.0082, 28.9784], size: 0.06 },
        // Add more active nodes for "Network" feel
        { location: [51.5074, -0.1278], size: 0.08 }, // London
        { location: [48.8566, 2.3522], size: 0.05 }, // Paris
        { location: [35.6762, 139.6503], size: 0.08 }, // Tokyo
        { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
        { location: [25.2048, 55.2708], size: 0.07 }, // Dubai
    ],
};

export function Globe({
    className,
    config = GLOBE_CONFIG,
}) {
    let phi = 0;
    let width = 0;
    const canvasRef = useRef(null);
    const pointerInteracting = useRef(null);
    const pointerInteractionMovement = useRef(0);
    const [r, setR] = useState(0);

    const updatePointerInteraction = (value) => {
        pointerInteracting.current = value;
        if (canvasRef.current) {
            canvasRef.current.style.cursor = value ? "grabbing" : "grab";
        }
    };

    const updateMovement = (clientX) => {
        if (pointerInteracting.current !== null) {
            const delta = clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setR(delta / 200);
        }
    };

    const onRender = useCallback(
        (state) => {
            if (!pointerInteracting.current) phi += 0.003; // Slower, premium rotation
            state.phi = phi + r;
            state.width = width * 2;
            state.height = width * 2;
        },
        [r],
    );

    const onResize = () => {
        if (canvasRef.current) {
            width = canvasRef.current.offsetWidth;
        }
    };

    useEffect(() => {
        window.addEventListener("resize", onResize);
        onResize();

        const globe = createGlobe(canvasRef.current, {
            ...config,
            width: width * 2,
            height: width * 2,
            onRender,
        });

        setTimeout(() => (canvasRef.current.style.opacity = "1"));
        return () => globe.destroy();
    }, []);

    return (
        <div
            className={cn(
                "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[1200px]",
                className,
            )}
        >
            <canvas
                className={cn(
                    "size-full opacity-0 transition-opacity duration-1000 ease-out [contain:layout_paint_size]",
                )}
                ref={canvasRef}
                onPointerDown={(e) =>
                    updatePointerInteraction(
                        e.clientX - pointerInteractionMovement.current,
                    )
                }
                onPointerUp={() => updatePointerInteraction(null)}
                onPointerOut={() => updatePointerInteraction(null)}
                onMouseMove={(e) => updateMovement(e.clientX)}
                onTouchMove={(e) =>
                    e.touches[0] && updateMovement(e.touches[0].clientX)
                }
            />
        </div>
    );
}
