import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// ─── Procedural Texture Utilities ──────────────────────────────────────────────
const makeTex = (fn, size = 512) => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    fn(c.getContext('2d'), size)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    return t
}
const addNoise = (ctx, amt = 12) => {
    const s = ctx.canvas.width
    const img = ctx.getImageData(0, 0, s, s)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * amt
        d[i] = Math.max(0, Math.min(255, d[i] + n))
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
    }
    ctx.putImageData(img, 0, 0)
}
const splotch = (ctx, count, s, minV, maxV, alpha = 0.2) => {
    for (let i = 0; i < count; i++) {
        const x = Math.random() * s
        const y = Math.random() * s
        const r = 20 + Math.random() * 50
        const v = minV + Math.random() * (maxV - minV)
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(${v},${v - 3},${v - 6},${alpha})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, s, s)
    }
}
/** Derives a normal map from a source canvas heightmap. */
const deriveNormal = (srcCanvas, strength = 2.0) => {
    const s = srcCanvas.width
    const srcCtx = srcCanvas.getContext('2d')
    const srcData = srcCtx.getImageData(0, 0, s, s).data
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')
    const dst = ctx.createImageData(s, s)
    const getH = (x, y) => {
        const px = ((x % s) + s) % s
        const py = ((y % s) + s) % s
        return srcData[(py * s + px) * 4] / 255
    }
    for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
            const idx = (y * s + x) * 4
            const dx = (getH(x - 1, y) - getH(x + 1, y)) * strength
            const dy = (getH(x, y - 1) - getH(x, y + 1)) * strength
            dst.data[idx] = Math.min(255, Math.max(0, 128 + dx * 128))
            dst.data[idx + 1] = Math.min(255, Math.max(0, 128 + dy * 128))
            dst.data[idx + 2] = 255
            dst.data[idx + 3] = 255
        }
    }
    ctx.putImageData(dst, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
}
// ─── Texture Generators ────────────────────────────────────────────────────────
const createConcreteTextures = () => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#c5c0b8'
    ctx.fillRect(0, 0, 512, 512)
    splotch(ctx, 40, 512, 170, 210, 0.15)
    addNoise(ctx, 14)
    // Joint lines
    ctx.strokeStyle = 'rgba(85,80,72,0.3)'
    ctx.lineWidth = 2
    for (let p = 128; p < 512; p += 128) {
        ctx.beginPath()
        ctx.moveTo(p, 0)
        ctx.lineTo(p, 512)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, p)
        ctx.lineTo(512, p)
        ctx.stroke()
    }
    // Subtle cracks
    ctx.strokeStyle = 'rgba(70,65,60,0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
        ctx.beginPath()
        let x = Math.random() * 512
        let y = Math.random() * 512
        ctx.moveTo(x, y)
        for (let j = 0; j < 4; j++) {
            x += (Math.random() - 0.5) * 80
            y += (Math.random() - 0.5) * 80
            ctx.lineTo(x, y)
        }
        ctx.stroke()
    }
    const map = new THREE.CanvasTexture(c)
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.colorSpace = THREE.SRGBColorSpace
    const normal = deriveNormal(c, 1.5)
    return { map, normal }
}
const createMetalPanelTextures = () => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#b8bcc0'
    ctx.fillRect(0, 0, 512, 512)
    splotch(ctx, 15, 512, 160, 200, 0.08)
    addNoise(ctx, 6)
    // Vertical panel seams
    ctx.strokeStyle = 'rgba(60,65,70,0.35)'
    ctx.lineWidth = 1.5
    for (let x = 0; x < 512; x += 64) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 512)
        ctx.stroke()
    }
    // Horizontal weld seams
    ctx.strokeStyle = 'rgba(70,70,75,0.25)'
    ctx.lineWidth = 2
    for (let y = 128; y < 512; y += 128) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(512, y)
        ctx.stroke()
    }
    const map = new THREE.CanvasTexture(c)
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.colorSpace = THREE.SRGBColorSpace
    const normal = deriveNormal(c, 2.5)
    return { map, normal }
}
const createRoughnessMap = (base = 128, variation = 40, size = 256) => {
    return makeTex((ctx, s) => {
        ctx.fillStyle = `rgb(${base},${base},${base})`
        ctx.fillRect(0, 0, s, s)
        addNoise(ctx, variation)
    }, size)
}
const createAggregateTexture = (r, g, b) => {
    return makeTex((ctx, s) => {
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(0, 0, s, s)
        // Chunky particles
        for (let i = 0; i < 3000; i++) {
            const px = Math.random() * s
            const py = Math.random() * s
            const pr = 1 + Math.random() * 3
            const v = Math.random() * 60 - 30
            ctx.fillStyle = `rgb(${Math.max(0, r + v)},${Math.max(0, g + v)},${Math.max(0, b + v)})`
            ctx.beginPath()
            ctx.arc(px, py, pr, 0, Math.PI * 2)
            ctx.fill()
        }
        addNoise(ctx, 18)
    }, 256)
}
const createBrickTexture = () => {
    return makeTex((ctx, s) => {
        ctx.fillStyle = '#a07050'
        ctx.fillRect(0, 0, s, s)
        // Brick pattern
        const bw = 64
        const bh = 32
        const gap = 3
        ctx.fillStyle = '#706050'
        for (let row = 0; row < s / bh; row++) {
            const offset = ((row % 2) * bw) / 2
            for (let col = -1; col < s / bw + 1; col++) {
                const bx = col * bw + offset
                const by = row * bh
                ctx.fillStyle = `rgb(${140 + Math.random() * 40},${85 + Math.random() * 30},${60 + Math.random() * 30})`
                ctx.fillRect(bx + gap / 2, by + gap / 2, bw - gap, bh - gap)
            }
        }
        addNoise(ctx, 8)
    }, 512)
}
// ─── Environment Map Generation ────────────────────────────────────────────────
const generateEnvMap = (renderer) => {
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    // Gradient sky dome
    const skyGeo = new THREE.SphereGeometry(100, 32, 16)
    const skyMat = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vWP; void main(){vWP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec3 vWP;void main(){float h=normalize(vWP).y;vec3 top=vec3(0.35,0.55,0.92);vec3 mid=vec3(0.7,0.82,0.95);vec3 bot=vec3(0.55,0.58,0.52);vec3 col=h>0.0?mix(mid,top,h):mix(mid,bot,-h*2.0);gl_FragColor=vec4(col,1.0);}`,
        side: THREE.BackSide
    })
    envScene.add(new THREE.Mesh(skyGeo, skyMat))
    // Bright sun disc for specular highlights
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 8), sunMat)
    sunMesh.position.set(30, 45, 25)
    envScene.add(sunMesh)
    // Subtle ground reflection
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x8a8a78 })
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.position.y = -10
    envScene.add(groundMesh)
    const envMap = pmrem.fromScene(envScene, 0, 0.1, 300).texture
    pmrem.dispose()
    return envMap
}
// ─── Material Factory ──────────────────────────────────────────────────────────
let TEX = null
const initTextures = (renderer) => {
    if (TEX) return TEX
    const concrete = createConcreteTextures()
    const metalPanel = createMetalPanelTextures()
    const envMap = generateEnvMap(renderer)
    TEX = {
        envMap,
        concrete,
        metalPanel,
        sandTex: createAggregateTexture(210, 195, 145),
        gravelTex: createAggregateTexture(115, 108, 96),
        stoneTex: createAggregateTexture(100, 95, 88),
        sandLightTex: createAggregateTexture(225, 215, 165),
        brickTex: createBrickTexture(),
        metalRoughness: createRoughnessMap(80, 25),
        concreteRoughness: createRoughnessMap(210, 30)
    }
    return TEX
}
const mat = {
    siloBody: () => {
        const m = new THREE.MeshPhysicalMaterial({
            map: TEX.metalPanel.map,
            normalMap: TEX.metalPanel.normal,
            roughness: 0.28,
            metalness: 0.75,
            envMap: TEX.envMap,
            envMapIntensity: 1.2,
            clearcoat: 0.15,
            clearcoatRoughness: 0.4
        })
        m.map.repeat.set(3, 4)
        m.normalMap.repeat.set(3, 4)
        return m
    },
    siloTop: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0x18264e,
            roughness: 0.35,
            metalness: 0.6,
            envMap: TEX.envMap,
            envMapIntensity: 0.8,
            clearcoat: 0.3,
            clearcoatRoughness: 0.3
        }),
    siloRing: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0xdd4a20,
            roughness: 0.35,
            metalness: 0.55,
            envMap: TEX.envMap,
            envMapIntensity: 1.0
        }),
    siloRingDark: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0x1a2850,
            roughness: 0.35,
            metalness: 0.55,
            envMap: TEX.envMap,
            envMapIntensity: 0.8
        }),
    steel: () =>
        new THREE.MeshStandardMaterial({
            color: 0x6a7075,
            roughness: 0.35,
            metalness: 0.8,
            envMap: TEX.envMap,
            envMapIntensity: 0.9
        }),
    steelDark: () =>
        new THREE.MeshStandardMaterial({
            color: 0x484e54,
            roughness: 0.45,
            metalness: 0.7,
            envMap: TEX.envMap,
            envMapIntensity: 0.7
        }),
    redSteel: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0xb82520,
            roughness: 0.4,
            metalness: 0.5,
            envMap: TEX.envMap,
            envMapIntensity: 0.6,
            clearcoat: 0.2,
            clearcoatRoughness: 0.5
        }),
    redPaint: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0xb32520,
            roughness: 0.45,
            metalness: 0.4,
            envMap: TEX.envMap,
            envMapIntensity: 0.5,
            clearcoat: 0.15,
            clearcoatRoughness: 0.5
        }),
    concrete: (rep = 4) => {
        const m = new THREE.MeshStandardMaterial({
            map: TEX.concrete.map.clone(),
            normalMap: TEX.concrete.normal.clone(),
            roughness: 0.88,
            metalness: 0.02,
            normalScale: new THREE.Vector2(0.6, 0.6)
        })
        m.map.repeat.set(rep, rep)
        m.normalMap.repeat.set(rep, rep)
        m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping
        m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping
        return m
    },
    concreteLight: (rep = 8) => {
        const m = new THREE.MeshStandardMaterial({
            map: TEX.concrete.map.clone(),
            normalMap: TEX.concrete.normal.clone(),
            color: 0xe0ddd6,
            roughness: 0.85,
            metalness: 0.02,
            normalScale: new THREE.Vector2(0.4, 0.4)
        })
        m.map.repeat.set(rep, rep)
        m.normalMap.repeat.set(rep, rep)
        m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping
        m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping
        return m
    },
    wallBlue: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0x2258aa,
            roughness: 0.45,
            metalness: 0.35,
            envMap: TEX.envMap,
            envMapIntensity: 0.5,
            clearcoat: 0.1,
            clearcoatRoughness: 0.6
        }),
    wallBlueDark: () => new THREE.MeshStandardMaterial({ color: 0x183a78, roughness: 0.5, metalness: 0.3 }),
    officeWall: () => new THREE.MeshStandardMaterial({ color: 0xe6e4e0, roughness: 0.65, metalness: 0.03 }),
    roofMetal: () =>
        new THREE.MeshStandardMaterial({
            color: 0x555a5e,
            roughness: 0.4,
            metalness: 0.6,
            envMap: TEX.envMap,
            envMapIntensity: 0.6
        }),
    roofDark: () =>
        new THREE.MeshStandardMaterial({
            color: 0x3a3e42,
            roughness: 0.45,
            metalness: 0.55,
            envMap: TEX.envMap,
            envMapIntensity: 0.5
        }),
    glass: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0x88bbdd,
            roughness: 0.05,
            metalness: 0.1,
            transparent: true,
            opacity: 0.4,
            envMap: TEX.envMap,
            envMapIntensity: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05
        }),
    belt: () => new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.82, metalness: 0.08 }),
    rubber: () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92, metalness: 0.0 }),
    sand: () => {
        const m = new THREE.MeshStandardMaterial({ map: TEX.sandTex, roughness: 0.95, metalness: 0 })
        m.map.repeat.set(2, 2)
        return m
    },
    gravel: () => {
        const m = new THREE.MeshStandardMaterial({ map: TEX.gravelTex, roughness: 0.95, metalness: 0 })
        m.map.repeat.set(2, 2)
        return m
    },
    stone: () => {
        const m = new THREE.MeshStandardMaterial({ map: TEX.stoneTex, roughness: 0.95, metalness: 0 })
        m.map.repeat.set(2, 2)
        return m
    },
    sandLight: () => {
        const m = new THREE.MeshStandardMaterial({ map: TEX.sandLightTex, roughness: 0.95, metalness: 0 })
        m.map.repeat.set(2, 2)
        return m
    },
    truckWhite: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0xeae8e2,
            roughness: 0.3,
            metalness: 0.15,
            envMap: TEX.envMap,
            envMapIntensity: 0.8,
            clearcoat: 0.5,
            clearcoatRoughness: 0.2
        }),
    drumSilver: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0xb0b4b8,
            roughness: 0.25,
            metalness: 0.65,
            envMap: TEX.envMap,
            envMapIntensity: 1.0
        }),
    yellow: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0xd8b020,
            roughness: 0.4,
            metalness: 0.2,
            envMap: TEX.envMap,
            envMapIntensity: 0.6,
            clearcoat: 0.3,
            clearcoatRoughness: 0.4
        }),
    galvanized: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0x9aa0a5,
            roughness: 0.3,
            metalness: 0.7,
            envMap: TEX.envMap,
            envMapIntensity: 1.0
        }),
    brick: () => {
        const m = new THREE.MeshStandardMaterial({ map: TEX.brickTex, roughness: 0.85, metalness: 0.02 })
        m.map.repeat.set(2, 2)
        return m
    },
    asphalt: () => new THREE.MeshStandardMaterial({ color: 0x353535, roughness: 0.95, metalness: 0.0 }),
    water: () =>
        new THREE.MeshPhysicalMaterial({
            color: 0x607878,
            roughness: 0.15,
            metalness: 0.2,
            envMap: TEX.envMap,
            envMapIntensity: 0.8,
            transparent: true,
            opacity: 0.7
        }),
    roofRust: () =>
        new THREE.MeshStandardMaterial({
            color: 0x7a4228,
            roughness: 0.65,
            metalness: 0.35,
            envMap: TEX.envMap,
            envMapIntensity: 0.4
        }),
    tree: () => new THREE.MeshStandardMaterial({ color: 0x2e6e2e, roughness: 0.88, metalness: 0.0 }),
    treeMed: () => new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.88, metalness: 0.0 }),
    treeLight: () => new THREE.MeshStandardMaterial({ color: 0x4a8a38, roughness: 0.88, metalness: 0.0 }),
    bark: () => new THREE.MeshStandardMaterial({ color: 0x4a301a, roughness: 0.95, metalness: 0.0 })
}
// ─── Geometry Helpers ──────────────────────────────────────────────────────────
const addTo = (parent, geo, material, x, y, z) => {
    const m = new THREE.Mesh(geo, material)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
const cyl = (rt, rb, h, seg = 48) => new THREE.CylinderGeometry(rt, rb, h, seg)
const cone = (r, h, seg = 48) => new THREE.ConeGeometry(r, h, seg)
const sphere = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h)
// ─── Cement Silo ───────────────────────────────────────────────────────────────
const buildSilo = (scene, cx, cz) => {
    const g = new THREE.Group()
    g.position.set(cx, 0, cz)
    const bodyM = mat.siloBody()
    const topM = mat.siloTop()
    const ringM = mat.siloRing()
    const ringDkM = mat.siloRingDark()
    const stlM = mat.steel()
    const dkM = mat.steelDark()
    const rdM = mat.redSteel()
    // Support legs (4)
    const legH = 12
    const sp = 2.0
    const legs = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1]
    ]
    legs.forEach(([dx, dz]) => {
        addTo(g, cyl(0.2, 0.28, legH, 12), stlM, dx * sp * 0.5, legH / 2, dz * sp * 0.5)
        addTo(g, box(0.7, 0.15, 0.7), stlM, dx * sp * 0.5, 0.075, dz * sp * 0.5)
    })
    // Horizontal bracing
    for (let rh = 3; rh < legH; rh += 3) {
        addTo(g, box(sp + 0.4, 0.1, 0.1), dkM, 0, rh, -sp * 0.5)
        addTo(g, box(sp + 0.4, 0.1, 0.1), dkM, 0, rh, sp * 0.5)
        addTo(g, box(0.1, 0.1, sp + 0.4), dkM, -sp * 0.5, rh, 0)
        addTo(g, box(0.1, 0.1, sp + 0.4), dkM, sp * 0.5, rh, 0)
    }
    // X-bracing on each face
    for (let face = 0; face < 4; face++) {
        const a = legs[face]
        const b = legs[(face + 1) % 4]
        const mx = (a[0] + b[0]) * sp * 0.25
        const mz = (a[1] + b[1]) * sp * 0.25
        for (let bh = 1.5; bh < legH - 2; bh += 5) {
            const br = addTo(g, cyl(0.04, 0.04, 4.5, 6), dkM, mx, bh + 2, mz)
            br.rotation.z = 0.45 * (bh < 6 ? 1 : -1)
        }
    }
    // Discharge cone
    const dc = addTo(g, cone(2.3, 4.5, 48), bodyM, 0, legH - 1.2, 0)
    dc.rotation.x = Math.PI
    addTo(g, cyl(0.35, 0.28, 2.2, 12), dkM, 0, legH - 4.5, 0)
    addTo(g, box(0.85, 0.6, 0.85), dkM, 0, legH - 5.5, 0)
    // Main barrel
    const bH = 22
    const bR = 2.5
    const bY = legH + bH / 2
    addTo(g, cyl(bR, bR, bH, 48), bodyM, 0, bY, 0)
    // Accent bands
    addTo(g, cyl(bR + 0.07, bR + 0.07, 0.5, 48), ringM, 0, legH + 1, 0)
    addTo(g, cyl(bR + 0.07, bR + 0.07, 0.5, 48), ringM, 0, legH + bH * 0.5, 0)
    addTo(g, cyl(bR + 0.05, bR + 0.05, 0.3, 48), ringDkM, 0, legH + bH * 0.25, 0)
    addTo(g, cyl(bR + 0.05, bR + 0.05, 0.3, 48), ringDkM, 0, legH + bH * 0.75, 0)
    // Top dome
    const topY = legH + bH
    addTo(g, cyl(bR, bR * 0.88, 2, 48), topM, 0, topY + 1, 0)
    addTo(g, cone(bR * 0.65, 3.2, 32), topM, 0, topY + 3.6, 0)
    addTo(g, cyl(0.18, 0.18, 2.5, 8), stlM, 0.9, topY + 4, 0)
    // Ladder
    const lx = bR + 0.15
    addTo(g, box(0.05, legH + bH + 2, 0.05), rdM, lx, (legH + bH) / 2, -0.18)
    addTo(g, box(0.05, legH + bH + 2, 0.05), rdM, lx, (legH + bH) / 2, 0.18)
    for (let ry = 1; ry < legH + bH + 1; ry += 0.45) {
        addTo(g, box(0.025, 0.025, 0.36), rdM, lx, ry, 0).castShadow = false
    }
    // Safety cage
    for (let ry = legH + 2; ry < topY; ry += 1.0) {
        const cage = addTo(g, cyl(0.4, 0.4, 0.025, 10), rdM, lx, ry, 0)
        cage.rotation.x = Math.PI / 2
    }
    // Catwalk
    addTo(g, cyl(bR + 0.8, bR + 0.8, 0.08, 48), dkM, 0, topY + 0.04, 0)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
        addTo(g, cyl(0.02, 0.02, 1.0, 6), rdM, Math.cos(a) * (bR + 0.7), topY + 0.55, Math.sin(a) * (bR + 0.7))
    }
    const rail = addTo(g, new THREE.TorusGeometry(bR + 0.7, 0.02, 6, 48), rdM, 0, topY + 1.05, 0)
    rail.rotation.x = Math.PI / 2
    scene.add(g)
}
// ─── Batch Tower ───────────────────────────────────────────────────────────────
const buildBatchTower = (scene, tx, tz) => {
    const g = new THREE.Group()
    g.position.set(tx, 0, tz)
    const rdM = mat.redPaint()
    const stlM = mat.steel()
    const dkM = mat.steelDark()
    const tW = 8
    const tD = 6
    const tH = 16
    addTo(g, box(tW, tH, tD), rdM, 0, tH / 2, 0)
    // Steel frame edges
    const cs = [
        [-tW / 2, -tD / 2],
        [tW / 2, -tD / 2],
        [-tW / 2, tD / 2],
        [tW / 2, tD / 2]
    ]
    cs.forEach(([cx, cz]) => addTo(g, box(0.22, tH + 0.4, 0.22), dkM, cx, tH / 2, cz))
    // Horizontal bands
    for (let h = 4; h <= tH; h += 4) {
        addTo(g, box(tW + 0.25, 0.12, 0.12), dkM, 0, h, -tD / 2)
        addTo(g, box(tW + 0.25, 0.12, 0.12), dkM, 0, h, tD / 2)
        addTo(g, box(0.12, 0.12, tD + 0.25), dkM, -tW / 2, h, 0)
        addTo(g, box(0.12, 0.12, tD + 0.25), dkM, tW / 2, h, 0)
    }
    // Windows
    for (let wy = 6; wy <= 14; wy += 4) {
        addTo(g, box(1.1, 1.4, 0.08), mat.glass(), -tW / 2 + 2, wy, tD / 2 + 0.04)
        addTo(g, box(1.1, 1.4, 0.08), mat.glass(), tW / 2 - 2, wy, tD / 2 + 0.04)
    }
    // Equipment inside
    addTo(g, cyl(1.5, 1.5, 3, 16), dkM, -1.5, 8, 0).rotation.z = Math.PI / 2
    addTo(g, cyl(1.5, 1.5, 3, 16), dkM, 1.5, 8, 0).rotation.z = Math.PI / 2
    addTo(g, cyl(1.2, 0.8, 2, 12), stlM, -1.5, 12, 0)
    addTo(g, cyl(1.2, 0.8, 2, 12), stlM, 1.5, 12, 0)
    // Platform
    addTo(g, box(tW + 2.5, 0.12, tD + 2.5), dkM, 0, tH + 0.06, 0)
    addTo(g, box(tW + 2.5, 0.05, 0.05), mat.redSteel(), 0, tH + 1, -(tD / 2 + 1.2))
    addTo(g, box(tW + 2.5, 0.05, 0.05), mat.redSteel(), 0, tH + 1, tD / 2 + 1.2)
    // Discharge chutes
    addTo(g, cyl(0.5, 0.32, 3, 10), dkM, -1.5, 1.5, tD / 2 + 1)
    addTo(g, cyl(0.5, 0.32, 3, 10), dkM, 1.5, 1.5, tD / 2 + 1)
    addTo(g, box(3, 1.5, 2), stlM, -1.5, 0.75, tD / 2 + 2)
    addTo(g, box(3, 1.5, 2), stlM, 1.5, 0.75, tD / 2 + 2)
    scene.add(g)
}
// ─── Aggregate Bays ────────────────────────────────────────────────────────────
const buildAggregateBays = (scene) => {
    const g = new THREE.Group()
    g.position.set(28, 0, -15)
    const stlM = mat.steel()
    const roofM = mat.roofDark()
    const wallM = mat.roofRust()
    const bays = 4
    const bW = 10
    const bD = 14
    const bH = 10
    const totW = bays * bW
    for (let i = 0; i < bays; i++) {
        const bx = -totW / 2 + i * bW + bW / 2
        // Arched roof
        const archSeg = 20
        const shape = new THREE.Shape()
        shape.moveTo(-bW / 2, 0)
        for (let s = 0; s <= archSeg; s++) {
            const a = (Math.PI * s) / archSeg
            shape.lineTo(-bW / 2 + (bW * s) / archSeg, Math.sin(a) * bH * 0.4)
        }
        shape.lineTo(bW / 2, 0)
        addTo(g, new THREE.ExtrudeGeometry(shape, { depth: bD, bevelEnabled: false }), roofM, bx, bH * 0.6, -bD / 2)
        // Walls
        addTo(g, box(bW - 0.2, bH, 0.12), wallM, bx, bH / 2, -bD / 2)
        if (i < bays - 1) addTo(g, box(0.12, bH, bD), wallM, bx + bW / 2, bH / 2, 0)
        if (i === 0) addTo(g, box(0.12, bH, bD), wallM, bx - bW / 2, bH / 2, 0)
        if (i === bays - 1) addTo(g, box(0.12, bH, bD), wallM, bx + bW / 2, bH / 2, 0)
        // Columns
        addTo(g, cyl(0.16, 0.16, bH, 10), stlM, bx - bW / 2 + 0.5, bH / 2, bD / 2 - 0.5)
        addTo(g, cyl(0.16, 0.16, bH, 10), stlM, bx + bW / 2 - 0.5, bH / 2, bD / 2 - 0.5)
        // Dividers
        addTo(g, box(0.3, 2, bD - 2), mat.concrete(1), bx - bW / 4, 1, 0)
        addTo(g, box(0.3, 2, bD - 2), mat.concrete(1), bx + bW / 4, 1, 0)
        // Material piles
        const matPairs = [
            [mat.sand, mat.sandLight],
            [mat.gravel, mat.stone],
            [mat.gravel, mat.sand],
            [mat.stone, mat.gravel]
        ]
        matPairs[i].forEach((fn, pi) => {
            const px = bx + (pi === 0 ? -bW / 4 : bW / 4)
            const pm = fn()
            addTo(g, cone(bW / 5.5, 3.5, 12), pm, px, 1.75, 1)
            const base = addTo(g, sphere(bW / 5, 10, 6), pm, px, 0.25, 1)
            base.scale.y = 0.12
            addTo(g, cone(1.0, 1.2, 8), pm, px + 1.3, 0.6, 2.5)
            addTo(g, cone(0.8, 0.8, 8), pm, px - 1.0, 0.4, -1.2)
        })
    }
    scene.add(g)
}
// ─── Conveyor ──────────────────────────────────────────────────────────────────
const buildConveyor = (scene, sx, sy, sz, ex, ey, ez, w = 0.8) => {
    const g = new THREE.Group()
    const dx = ex - sx
    const dy = ey - sy
    const dz = ez - sz
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz))
    const yaw = Math.atan2(dx, dz)
    const stlM = mat.steelDark()
    const bltM = mat.belt()
    const truss = new THREE.Group()
    addTo(truss, box(w + 0.35, 0.1, len), stlM, 0, -0.12, 0)
    addTo(truss, box(0.07, 0.32, len), stlM, -(w / 2 + 0.18), 0, 0)
    addTo(truss, box(0.07, 0.32, len), stlM, w / 2 + 0.18, 0, 0)
    addTo(truss, box(w + 0.35, 0.06, len), stlM, 0, 0.18, 0)
    addTo(truss, box(w, 0.04, len - 0.3), bltM, 0, 0.1, 0)
    for (let ri = -len / 2 + 0.6; ri < len / 2; ri += 1.0) {
        const rol = addTo(truss, cyl(0.04, 0.04, w + 0.12, 8), mat.steel(), 0, 0.04, ri)
        rol.rotation.z = Math.PI / 2
    }
    const pulM = mat.steel()
    addTo(truss, cyl(0.12, 0.12, w + 0.25, 12), pulM, 0, 0.1, -len / 2 + 0.12).rotation.z = Math.PI / 2
    addTo(truss, cyl(0.12, 0.12, w + 0.25, 12), pulM, 0, 0.1, len / 2 - 0.12).rotation.z = Math.PI / 2
    truss.position.set((sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2)
    truss.rotation.order = 'YXZ'
    truss.rotation.y = yaw
    truss.rotation.x = -pitch
    g.add(truss)
    // A-frame supports
    const lc = Math.max(2, Math.floor(len / 5))
    for (let i = 0; i <= lc; i++) {
        const t = i / lc
        const lx = sx + dx * t
        const ly = sy + dy * t
        const lz = sz + dz * t
        if (ly > 1.2) {
            const lg = new THREE.Group()
            lg.position.set(lx, 0, lz)
            const l1 = addTo(lg, cyl(0.07, 0.09, ly, 8), stlM, -0.45, ly / 2, 0)
            l1.rotation.z = 0.05
            const l2 = addTo(lg, cyl(0.07, 0.09, ly, 8), stlM, 0.45, ly / 2, 0)
            l2.rotation.z = -0.05
            addTo(lg, box(1.1, 0.06, 0.06), stlM, 0, ly * 0.4, 0)
            addTo(lg, box(1.1, 0.06, 0.06), stlM, 0, ly * 0.7, 0)
            g.add(lg)
        }
    }
    scene.add(g)
}
// ─── Mixer Truck ───────────────────────────────────────────────────────────────
const buildMixerTruck = (scene, px, pz, rotY = 0) => {
    const g = new THREE.Group()
    const cabM = mat.truckWhite()
    const drumM = mat.drumSilver()
    const chM = mat.steelDark()
    const tirM = mat.rubber()
    addTo(g, box(2.2, 0.2, 8), chM, 0, 0.64, 0)
    addTo(g, box(2.3, 1.9, 2.8), cabM, 0, 1.7, -2.8)
    addTo(g, box(2.0, 1.0, 0.04), mat.glass(), 0, 2.15, -4.24)
    addTo(g, box(0.3, 0.18, 0.06), mat.yellow(), -0.72, 1.08, -4.24)
    addTo(g, box(0.3, 0.18, 0.06), mat.yellow(), 0.72, 1.08, -4.24)
    addTo(g, box(0.35, 0.25, 0.05), chM, -1.25, 2.2, -3.2)
    addTo(g, box(0.35, 0.25, 0.05), chM, 1.25, 2.2, -3.2)
    const drum = addTo(g, cyl(1.28, 0.98, 5.2, 24), drumM, 0, 2.6, 1.0)
    drum.rotation.x = -0.12
    const drc = addTo(g, cone(0.98, 1.3, 24), drumM, 0, 2.95, 3.9)
    drc.rotation.x = -0.12
    addTo(g, cyl(1.31, 1.31, 0.08, 24), chM, 0, 2.32, -1.5).rotation.x = -0.12
    addTo(g, box(0.75, 0.3, 2.0), chM, -0.88, 0.95, 0.8)
    addTo(g, box(0.75, 0.3, 2.0), chM, 0.88, 0.95, 0.8)
    addTo(g, box(0.45, 0.1, 2.0), chM, 0, 1.55, 5.0)
    addTo(g, box(0.32, 0.1, 1.1), chM, 0, 1.15, 5.8)
    addTo(g, cyl(0.28, 0.28, 1.1, 8), mat.steel(), 0.85, 1.08, -0.8).rotation.z = Math.PI / 2
    const axles = [
        { z: -3.0, dual: false },
        { z: 1.5, dual: true },
        { z: 2.8, dual: true }
    ]
    axles.forEach(({ z, dual }) => {
        const wx = dual ? [-1.08, -1.32, 1.08, 1.32] : [-1.12, 1.12]
        wx.forEach((x) => {
            addTo(g, cyl(0.44, 0.44, 0.28, 16), tirM, x, 0.44, z).rotation.x = Math.PI / 2
            addTo(g, cyl(0.2, 0.2, 0.29, 10), chM, x, 0.44, z).rotation.x = Math.PI / 2
        })
    })
    addTo(g, box(2.55, 0.05, 0.75), cabM, 0, 0.92, -3.0)
    g.position.set(px, 0, pz)
    g.rotation.y = rotY
    scene.add(g)
}
// ─── Wheel Loader ──────────────────────────────────────────────────────────────
const buildWheelLoader = (scene, px, pz, rotY = 0) => {
    const g = new THREE.Group()
    const bM = mat.yellow()
    const tirM = mat.rubber()
    const chM = mat.steelDark()
    addTo(g, box(2.3, 1.4, 3.3), bM, 0, 1.25, 0)
    addTo(g, box(2.1, 1.7, 1.9), bM, 0, 2.85, -0.3)
    addTo(g, box(1.9, 1.1, 0.03), mat.glass(), 0, 3.1, 0.66)
    addTo(g, box(0.03, 1.1, 1.4), mat.glass(), -1.06, 3.1, -0.1)
    addTo(g, box(0.03, 1.1, 1.4), mat.glass(), 1.06, 3.1, -0.1)
    addTo(g, box(0.12, 0.28, 3.3), bM, -0.85, 1.75, 2.7)
    addTo(g, box(0.12, 0.28, 3.3), bM, 0.85, 1.75, 2.7)
    addTo(g, box(2.5, 1.1, 0.1), chM, 0, 0.95, 4.5)
    addTo(g, box(2.5, 0.1, 1.4), chM, 0, 0.45, 3.8)
    addTo(g, box(0.1, 1.1, 1.4), chM, -1.25, 0.95, 3.8)
    addTo(g, box(0.1, 1.1, 1.4), chM, 1.25, 0.95, 3.8)
    const wps = [
        [-1.25, -0.95],
        [1.25, -0.95],
        [-1.25, 1.15],
        [1.25, 1.15]
    ]
    wps.forEach(([wx, wz]) => {
        addTo(g, cyl(0.75, 0.75, 0.55, 16), tirM, wx, 0.75, wz).rotation.x = Math.PI / 2
        addTo(g, cyl(0.32, 0.32, 0.56, 10), bM, wx, 0.75, wz).rotation.x = Math.PI / 2
    })
    g.position.set(px, 0, pz)
    g.rotation.y = rotY
    scene.add(g)
}
// ─── Office ────────────────────────────────────────────────────────────────────
const buildOffice = (scene) => {
    const g = new THREE.Group()
    g.position.set(-32, 0, -12)
    const wM = mat.officeWall()
    const rM = mat.roofMetal()
    const glM = mat.glass()
    addTo(g, box(14, 5, 10), wM, 0, 2.5, 0)
    addTo(g, box(14.4, 0.25, 10.4), rM, 0, 5.12, 0)
    addTo(g, box(14.6, 0.5, 0.25), wM, 0, 5.25, -5.12)
    addTo(g, box(14.6, 0.5, 0.25), wM, 0, 5.25, 5.12)
    for (let wx = -5; wx <= 5; wx += 2.5) addTo(g, box(1.4, 1.7, 0.06), glM, wx, 2.8, 5.04)
    addTo(g, box(1.9, 2.9, 0.06), mat.steelDark(), 0, 1.45, 5.04)
    for (let wz = -3; wz <= 3; wz += 3) addTo(g, box(0.06, 1.7, 1.4), glM, 7.04, 2.8, wz)
    addTo(g, box(2, 1.1, 2), mat.steelDark(), -3, 5.85, -2)
    addTo(g, box(2, 1.1, 2), mat.steelDark(), 3, 5.85, -2)
    addTo(g, box(16, 0.08, 3), rM, 0, 4.45, 6.8)
    addTo(g, cyl(0.07, 0.07, 4.45, 8), mat.steel(), -6, 2.22, 8)
    addTo(g, cyl(0.07, 0.07, 4.45, 8), mat.steel(), 6, 2.22, 8)
    scene.add(g)
}
// ─── Guard House ───────────────────────────────────────────────────────────────
const buildGuardHouse = (scene, gx, gz) => {
    const g = new THREE.Group()
    g.position.set(gx, 0, gz)
    addTo(g, box(3.5, 3, 3), mat.wallBlue(), 0, 1.5, 0)
    addTo(g, box(3.8, 0.18, 3.3), mat.roofMetal(), 0, 3.09, 0)
    addTo(g, box(1.4, 1.1, 0.06), mat.glass(), 0, 1.9, 1.54)
    addTo(g, box(0.9, 2.4, 0.06), mat.steelDark(), -0.75, 1.2, 1.54)
    addTo(g, box(0.12, 0.12, 7.5), mat.redSteel(), 3, 2.8, 0)
    scene.add(g)
}
// ─── Perimeter Wall ────────────────────────────────────────────────────────────
const buildPerimeterWall = (scene) => {
    const g = new THREE.Group()
    const wM = mat.wallBlue()
    const cM = mat.wallBlueDark()
    const L = -48
    const R = 58
    const F = 30
    const B = -32
    const wH = 2.8
    const wT = 0.35
    const gW = 9
    const gX = -10
    addTo(g, box(R - L, wH, wT), wM, (L + R) / 2, wH / 2, B)
    addTo(g, box(R - L + 0.15, 0.18, wT + 0.08), cM, (L + R) / 2, wH + 0.09, B)
    addTo(g, box(wT, wH, F - B), wM, L, wH / 2, (F + B) / 2)
    addTo(g, box(wT + 0.08, 0.18, F - B + 0.15), cM, L, wH + 0.09, (F + B) / 2)
    addTo(g, box(wT, wH, F - B), wM, R, wH / 2, (F + B) / 2)
    addTo(g, box(wT + 0.08, 0.18, F - B + 0.15), cM, R, wH + 0.09, (F + B) / 2)
    const lsW = gX - gW / 2 - L
    const rsX = gX + gW / 2
    const rsW = R - rsX
    addTo(g, box(lsW, wH, wT), wM, L + lsW / 2, wH / 2, F)
    addTo(g, box(lsW + 0.08, 0.18, wT + 0.08), cM, L + lsW / 2, wH + 0.09, F)
    addTo(g, box(rsW, wH, wT), wM, rsX + rsW / 2, wH / 2, F)
    addTo(g, box(rsW + 0.08, 0.18, wT + 0.08), cM, rsX + rsW / 2, wH + 0.09, F)
    addTo(g, box(0.75, wH + 1.4, 0.75), wM, gX - gW / 2, (wH + 1.4) / 2, F)
    addTo(g, box(0.75, wH + 1.4, 0.75), wM, gX + gW / 2, (wH + 1.4) / 2, F)
    addTo(g, box(0.95, 0.25, 0.95), cM, gX - gW / 2, wH + 1.4 + 0.12, F)
    addTo(g, box(0.95, 0.25, 0.95), cM, gX + gW / 2, wH + 1.4 + 0.12, F)
    addTo(g, box(gW + 0.75, 0.45, 0.45), mat.steel(), gX, wH + 1.1, F)
    scene.add(g)
}
// ─── Ground ────────────────────────────────────────────────────────────────────
const buildGround = (scene) => {
    const grass = addTo(
        scene,
        new THREE.PlaneGeometry(250, 250),
        new THREE.MeshStandardMaterial({ color: 0x4a7035, roughness: 0.95, metalness: 0 }),
        0,
        -0.08,
        0
    )
    grass.rotation.x = -Math.PI / 2
    const yard = addTo(scene, new THREE.PlaneGeometry(104, 60), mat.concreteLight(12), 5, 0.01, -1)
    yard.rotation.x = -Math.PI / 2
    const dkM = mat.concrete(6)
    for (let jx = -46; jx <= 56; jx += 8) {
        const j = addTo(scene, new THREE.PlaneGeometry(0.05, 58), dkM, jx, 0.018, -1)
        j.rotation.x = -Math.PI / 2
    }
    for (let jz = -30; jz <= 28; jz += 8) {
        const j = addTo(scene, new THREE.PlaneGeometry(104, 0.05), dkM, 5, 0.018, jz)
        j.rotation.x = -Math.PI / 2
    }
    const wtM = mat.water()
    const w1 = addTo(scene, new THREE.CircleGeometry(3, 24), wtM, -3, 0.022, 10)
    w1.rotation.x = -Math.PI / 2
    const w2 = addTo(scene, new THREE.CircleGeometry(2.5, 24), wtM, 4, 0.022, 12)
    w2.rotation.x = -Math.PI / 2
    const rd = addTo(scene, new THREE.PlaneGeometry(10, 18), mat.asphalt(), -10, 0.012, 39)
    rd.rotation.x = -Math.PI / 2
}
// ─── Trees ─────────────────────────────────────────────────────────────────────
const buildTrees = (scene) => {
    const bk = mat.bark()
    const tmats = [mat.tree(), mat.treeMed(), mat.treeLight()]
    const pos = []
    for (let i = 0; i < 55; i++) pos.push([-55 + Math.random() * 115, -35 - Math.random() * 14])
    for (let i = 0; i < 22; i++) {
        pos.push([-55 - Math.random() * 14, -32 + Math.random() * 68])
        pos.push([62 + Math.random() * 14, -32 + Math.random() * 68])
    }
    for (let i = 0; i < 18; i++) {
        pos.push([-52 + Math.random() * 38, 33 + Math.random() * 12])
        pos.push([12 + Math.random() * 52, 33 + Math.random() * 12])
    }
    pos.forEach(([tx, tz]) => {
        const h = 6 + Math.random() * 9
        const lm = tmats[Math.floor(Math.random() * 3)]
        addTo(scene, cyl(0.18, 0.28, h * 0.4, 8), bk, tx, h * 0.2, tz)
        const cr = 2.2 + Math.random() * 1.8
        const cy = h * 0.5
        const c1 = addTo(scene, sphere(cr, 10, 8), lm, tx, cy + cr * 0.6, tz)
        c1.scale.set(1, 1.15 + Math.random() * 0.3, 1)
        addTo(scene, sphere(cr * 0.7, 8, 6), lm, tx + cr * 0.4, cy + cr, tz - cr * 0.3)
        addTo(scene, sphere(cr * 0.55, 8, 6), lm, tx - cr * 0.3, cy + cr * 0.8, tz + cr * 0.4)
    })
}
// ─── Pickup Trucks ─────────────────────────────────────────────────────────────
const buildPickup = (scene, px, pz, rotY = 0, color = 0xe8e6e2) => {
    const g = new THREE.Group()
    const bM = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.3,
        metalness: 0.15,
        envMap: TEX.envMap,
        envMapIntensity: 0.7,
        clearcoat: 0.4,
        clearcoatRoughness: 0.25
    })
    addTo(g, box(1.95, 1.35, 4.6), bM, 0, 1.25, 0)
    addTo(g, box(1.85, 0.95, 1.9), bM, 0, 2.55, -0.75)
    addTo(g, box(1.55, 0.65, 0.03), mat.glass(), 0, 2.75, -1.74)
    addTo(g, box(1.75, 0.38, 1.9), mat.steelDark(), 0, 2.12, 1.1)
    const tirM = mat.rubber()
    const wps = [
        [-0.98, -1.15],
        [0.98, -1.15],
        [-0.98, 1.35],
        [0.98, 1.35]
    ]
    wps.forEach(([wx, wz]) => (addTo(g, cyl(0.36, 0.36, 0.22, 12), tirM, wx, 0.36, wz).rotation.x = Math.PI / 2))
    g.position.set(px, 0, pz)
    g.rotation.y = rotY
    scene.add(g)
}
// ─── Scene Composition ─────────────────────────────────────────────────────────
const buildBatchPlant = (scene) => {
    buildGround(scene)
    buildSilo(scene, -10, -8)
    buildSilo(scene, -4, -8)
    buildSilo(scene, -10, -2)
    buildSilo(scene, -4, -2)
    buildBatchTower(scene, -7, 4)
    buildAggregateBays(scene)
    buildConveyor(scene, 14, 1.5, -12, 0, 14, -2, 1.0)
    buildConveyor(scene, 14, 1.5, -18, -2, 14, -6, 1.0)
    buildConveyor(scene, 20, 0.8, -4, 28, 6, -8, 0.9)
    buildConveyor(scene, -5, 4, 8, -5, 1.5, 14, 0.6)
    buildConveyor(scene, -9, 4, 8, -9, 1.5, 14, 0.6)
    buildOffice(scene)
    buildGuardHouse(scene, -14, 28)
    buildPerimeterWall(scene)
    for (let i = 0; i < 4; i++) buildMixerTruck(scene, -35 + i * 5.5, 20, Math.PI)
    for (let i = 0; i < 3; i++) buildMixerTruck(scene, -33 + i * 5.5, 12, Math.PI)
    buildMixerTruck(scene, -9, 14, 0)
    buildMixerTruck(scene, -5, 14, 0)
    buildMixerTruck(scene, -10, 24, Math.PI * 0.1)
    buildWheelLoader(scene, 18, -8, -Math.PI / 3)
    buildWheelLoader(scene, 22, -2, Math.PI / 6)
    buildPickup(scene, -38, -4, Math.PI / 2, 0xf0eeea)
    buildPickup(scene, -38, 0, Math.PI / 2, 0xdddbd5)
    buildPickup(scene, -38, 4, Math.PI / 2, 0xc8c6c0)
    buildTrees(scene)
}
// ─── Three.js Init ─────────────────────────────────────────────────────────────
const initScene = (container) => {
    const w = container.clientWidth
    const h = container.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    // Init textures and env map (needs renderer)
    initTextures(renderer)
    const scene = new THREE.Scene()
    scene.environment = TEX.envMap
    scene.fog = new THREE.FogExp2(0x88c8e0, 0.0035)
    // Sky background gradient
    const skyGeo = new THREE.SphereGeometry(400, 32, 16)
    const skyMat = new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vWP;void main(){vWP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec3 vWP;void main(){float h=normalize(vWP).y;vec3 top=vec3(0.32,0.52,0.88);vec3 hz=vec3(0.72,0.84,0.95);vec3 col=mix(hz,top,max(h*2.0,0.0));gl_FragColor=vec4(col,1.0);}`,
        side: THREE.BackSide,
        depthWrite: false
    })
    scene.add(new THREE.Mesh(skyGeo, skyMat))
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.5, 500)
    camera.position.set(-50, 58, 72)
    camera.lookAt(5, 0, -5)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.target.set(5, 0, -5)
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 20
    controls.maxDistance = 180
    // Sun — key light
    const sun = new THREE.DirectionalLight(0xfff6e0, 2.5)
    sun.position.set(35, 55, 30)
    sun.castShadow = true
    sun.shadow.mapSize.width = 4096
    sun.shadow.mapSize.height = 4096
    sun.shadow.camera.left = -70
    sun.shadow.camera.right = 70
    sun.shadow.camera.top = 70
    sun.shadow.camera.bottom = -70
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 160
    sun.shadow.bias = -0.0003
    sun.shadow.normalBias = 0.02
    scene.add(sun)
    // Fill light — cool blue from opposite side
    const fill = new THREE.DirectionalLight(0xaac8ff, 0.6)
    fill.position.set(-25, 30, -25)
    scene.add(fill)
    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    scene.add(new THREE.HemisphereLight(0x88bbee, 0x667744, 0.4))
    // Rim light — subtle backlight for depth
    const rim = new THREE.DirectionalLight(0xffeedd, 0.3)
    rim.position.set(-30, 20, 40)
    scene.add(rim)
    buildBatchPlant(scene)
    let animId
    const animate = () => {
        animId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
    }
    animate()
    const onResize = () => {
        const nw = container.clientWidth
        const nh = container.clientHeight
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)
    return () => {
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(animId)
        controls.dispose()
        renderer.dispose()
        container.removeChild(renderer.domElement)
        TEX = null
    }
}
// ─── React Component ───────────────────────────────────────────────────────────
const TestThreeView = () => {
    const containerRef = useRef(null)
    useEffect(() => {
        if (!containerRef.current) return
        return initScene(containerRef.current)
    }, [])
    return (
        <div className="relative flex w-full flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Batch Plant — 3D View</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Click and drag to orbit, scroll to zoom</p>
            </div>
            <div ref={containerRef} className="min-h-0 flex-1" />
        </div>
    )
}
export default TestThreeView
