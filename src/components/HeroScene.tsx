import { useEffect, useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GeoConfig {
  geo: THREE.BufferGeometry
  position: [number, number, number]
  rotationSpeed: number
  rotationAxis: [number, number, number]
  scale: number
}

const COLORS = { light: '#8E9B8E', dark: '#6B7C6B' }

function Geometries() {
  const group = useRef<THREE.Group>(null!)
  const mouse = useRef({ x: 0, y: 0 })
  const scrollY = useRef(0)
  const [color, setColor] = useState(COLORS.light)

  // ── Detect theme ──
  useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setColor(isDark ? COLORS.dark : COLORS.light)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // ── Input tracking ──
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    const onScroll = () => { scrollY.current = window.scrollY }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const meshes = useMemo<GeoConfig[]>(
    () => [
      {
        geo: new THREE.TorusKnotGeometry(0.55, 0.18, 64, 8),
        position: [-2.2, 1.2, -1],
        rotationSpeed: 0.3,
        rotationAxis: [0.5, 1, 0.3],
        scale: 0.85,
      },
      {
        geo: new THREE.IcosahedronGeometry(0.5),
        position: [2.2, -1.5, -2],
        rotationSpeed: 0.2,
        rotationAxis: [1, 0.5, 0.2],
        scale: 0.75,
      },
      {
        geo: new THREE.OctahedronGeometry(0.55),
        position: [0.3, 0.8, 0.5],
        rotationSpeed: 0.25,
        rotationAxis: [0.3, 0.7, 1],
        scale: 0.65,
      },
      {
        geo: new THREE.TorusGeometry(0.45, 0.16, 16, 32),
        position: [2, 2, -1.5],
        rotationSpeed: 0.4,
        rotationAxis: [0.8, 0.2, 0.5],
        scale: 0.7,
      },
    ],
    []
  )

  const edgeGeos = useMemo(() => meshes.map((c) => new THREE.EdgesGeometry(c.geo)), [meshes])

  useFrame((_, delta) => {
    if (!group.current) return

    const g = group.current
    // Parallax — subtle follow
    g.rotation.x += (mouse.current.y * 0.06 - g.rotation.x) * delta * 0.6
    g.rotation.y += (mouse.current.x * 0.06 - g.rotation.y) * delta * 0.6

    // Self-rotation + scroll float
    const floatBase = Math.sin(scrollY.current * 0.002) * 0.25
    meshes.forEach((c, i) => {
      const child = g.children[i] as THREE.Group
      if (!child) return
      const mesh = child.children[0] as THREE.Mesh
      if (mesh) {
        mesh.rotation.x += c.rotationSpeed * delta * c.rotationAxis[0]
        mesh.rotation.y += c.rotationSpeed * delta * c.rotationAxis[1]
        mesh.rotation.z += c.rotationSpeed * delta * c.rotationAxis[2]
      }
      const sign = i % 2 === 0 ? 1 : -1
      child.position.y = c.position[1] + floatBase * sign
    })
  })

  return (
    <group ref={group}>
      {meshes.map((c, i) => (
        <group key={i} position={c.position}>
          <mesh scale={c.scale}>
            <primitive object={c.geo} />
            <meshPhysicalMaterial
              color={color}
              transparent
              opacity={0.35}
              roughness={0.4}
              metalness={0.1}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments scale={c.scale}>
            <primitive object={edgeGeos[i]} />
            <lineBasicMaterial color={color} transparent opacity={0.45} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}

export default function HeroScene() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Geometries />
      </Canvas>
    </div>
  )
}
